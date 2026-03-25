"""
서울시 열린 데이터 광장 - 일반음식점 인허가 정보 연동

API: http://openapi.seoul.go.kr:8088/{key}/json/LOCALDATA_072404/{start}/{end}/
데이터셋: LOCALDATA_072404 (일반음식점)

주요 필드:
  MGTNO       - 관리번호 (고유 ID)
  BPLCNM      - 사업장명 (음식점 이름)
  UPTAENM     - 업태구분명 (한식/중식 등)
  RDNWHLADDR  - 도로명 전체 주소
  X           - 경도 (longitude)
  Y           - 위도 (latitude)
  TRDSTATEGBN - 영업상태 코드 ('01'=영업 중)
"""

from __future__ import annotations

import httpx
from typing import Optional
from sqlalchemy.orm import Session

from app.repositories.restaurant_repository import RestaurantRepository

SEOUL_API_BASE = "http://openapi.seoul.go.kr:8088"
DATASET = "LOCALDATA_072404"

# 서울시 업태구분명 → 내부 카테고리 매핑
_SEOUL_CATEGORY_MAP: list[tuple[str, str]] = [
    ("한식", "Korean"),
    ("일식", "Japanese"),
    ("중식", "Chinese"),
    ("이탈리아", "Italian"),
    ("피자", "Italian"),
    ("프랑스", "French"),
    ("태국", "Thai"),
    ("인도", "Indian"),
    ("멕시코", "Mexican"),
    ("멕시칸", "Mexican"),
    ("경양식", "American"),
    ("패스트푸드", "American"),
    ("버거", "American"),
    ("치킨", "American"),
    ("분식", "Korean"),
    ("양식", "American"),
    ("지중해", "Mediterranean"),
]

# 제외할 업태 (카페/베이커리/주점 등)
_SKIP_CATEGORIES = {"카페", "베이커리", "제과", "주점", "호프", "소주방", "다방", "커피"}

_PRICE_MAP: dict[str, int] = {
    "패스트푸드": 1,
    "분식": 1,
    "버거": 1,
    "치킨": 1,
    "한식": 2,
    "일식": 2,
    "중식": 2,
    "경양식": 2,
    "양식": 2,
    "이탈리아": 2,
    "태국": 2,
    "인도": 2,
    "멕시코": 2,
    "프랑스": 3,
    "지중해": 3,
}


def _map_category(uptaenm: str) -> Optional[str]:
    """업태구분명 → 내부 카테고리. 제외 대상이면 None 반환."""
    for skip in _SKIP_CATEGORIES:
        if skip in uptaenm:
            return None
    for keyword, category in _SEOUL_CATEGORY_MAP:
        if keyword in uptaenm:
            return category
    return "Korean"  # 기본값


def _map_price(uptaenm: str) -> int:
    for keyword, price in _PRICE_MAP.items():
        if keyword in uptaenm:
            return price
    return 2


def _parse_row(row: dict) -> Optional[dict]:
    """서울 API row → restaurant 필드 dict. 유효하지 않으면 None."""
    # 영업 중인 곳만
    if row.get("TRDSTATEGBN") != "01":
        return None

    mgtno = str(row.get("MGTNO", "")).strip()
    name = str(row.get("BPLCNM", "")).strip()
    if not mgtno or not name:
        return None

    uptaenm = str(row.get("UPTAENM", "")).strip()
    category = _map_category(uptaenm)
    if category is None:
        return None

    address = str(row.get("RDNWHLADDR") or row.get("RDNADDR") or "").strip()

    try:
        lng = float(row.get("X") or 0)
        lat = float(row.get("Y") or 0)
    except (TypeError, ValueError):
        lng, lat = None, None

    # 좌표가 없거나 서울 범위를 벗어나면 스킵
    if not lat or not lng:
        return None
    if not (37.4 <= lat <= 37.7 and 126.7 <= lng <= 127.2):
        return None

    return {
        "kakao_id": f"seoul_{mgtno}",  # kakao_id 필드를 서울 데이터 ID로 재활용
        "name": name,
        "category": category,
        "address": address,
        "latitude": lat,
        "longitude": lng,
        "phone": str(row.get("SITETEL") or "").strip(),
        "price_range": _map_price(uptaenm),
        "rating": 0.0,
        "description": "",
        "image_url": "",
    }


class SeoulSyncService:
    def __init__(self, db: Session, api_key: str):
        self.db = db
        self.api_key = api_key
        self.repo = RestaurantRepository(db)

    def _fetch_page(self, start: int, end: int) -> tuple[list[dict], int]:
        """서울 API 한 페이지 조회. (rows, total_count) 반환."""
        url = f"{SEOUL_API_BASE}/{self.api_key}/json/{DATASET}/{start}/{end}/"
        resp = httpx.get(url, timeout=30)
        resp.raise_for_status()
        data = resp.json()

        dataset = data.get(DATASET, {})
        result = dataset.get("RESULT", {})
        code = result.get("CODE", "")
        if not code.startswith("INFO"):
            raise RuntimeError(f"서울 API 오류: {result.get('MESSAGE', code)}")

        total = int(dataset.get("list_total_count", 0))
        rows = dataset.get("row", [])
        return rows, total

    def sync(
        self,
        gu: Optional[str] = None,
        max_records: int = 1000,
        page_size: int = 500,
    ) -> dict:
        """
        서울시 음식점 데이터를 DB에 동기화합니다.

        Args:
            gu: 특정 구만 가져올 때 사용 (예: "강남구"). None이면 전체.
            max_records: 최대 조회 건수 (API 부하 방지)
            page_size: 한 번에 가져올 건수 (최대 1000)

        Returns:
            { created, updated, skipped, errors }
        """
        if not self.api_key:
            raise ValueError("SEOUL_API_KEY가 설정되지 않았습니다.")

        counts = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}
        start = 1

        while start <= max_records:
            end = min(start + page_size - 1, max_records)
            try:
                rows, total = self._fetch_page(start, end)
            except Exception as exc:
                raise RuntimeError(f"서울 API 요청 실패: {exc}") from exc

            if not rows:
                break

            for row in rows:
                # 구 필터
                if gu:
                    addr = str(row.get("RDNWHLADDR") or row.get("RDNADDR") or "")
                    if gu not in addr:
                        counts["skipped"] += 1
                        continue

                fields = _parse_row(row)
                if fields is None:
                    counts["skipped"] += 1
                    continue

                try:
                    _, created = self.repo.upsert_from_kakao(fields)
                    if created:
                        counts["created"] += 1
                    else:
                        counts["updated"] += 1
                except Exception:
                    self.db.rollback()
                    counts["errors"] += 1

            if end >= total or end >= max_records:
                break
            start = end + 1

        return counts
