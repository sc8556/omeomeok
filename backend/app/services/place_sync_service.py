"""
Kakao Local API integration for syncing nearby restaurants into the DB.

Kakao Local Search docs:
  https://developers.kakao.com/docs/latest/ko/local/dev-guide#search-by-keyword

Key details:
- Endpoint: GET https://dapi.kakao.com/v2/local/search/keyword.json
- Auth header: Authorization: KakaoAK {REST_API_KEY}
- category_group_code=FD6  →  음식점 only
- Pagination: page 1-45, size 1-15 (max 45*15=675 results per query)
"""

from __future__ import annotations

import httpx
from typing import Optional
from sqlalchemy.orm import Session

from app.repositories.restaurant_repository import RestaurantRepository

KAKAO_SEARCH_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"

# Map keywords found in Kakao category_name to our internal category strings.
# Kakao category_name looks like "음식점 > 한식 > 삼겹살"
_KAKAO_CATEGORY_KEYWORDS: list[tuple[str, str]] = [
    ("한식", "Korean"),
    ("일식", "Japanese"),
    ("중식", "Chinese"),
    ("이탈리아", "Italian"),
    ("프랑스", "French"),
    ("태국", "Thai"),
    ("인도", "Indian"),
    ("멕시코", "Mexican"),
    ("지중해", "Mediterranean"),
    ("양식", "Italian"),   # generic Western food → Italian bucket
    ("치킨", "American"),
    ("패스트푸드", "American"),
    ("분식", "Korean"),
    ("버거", "American"),
]

# Price-range heuristic based on Kakao category keywords
_PRICE_KEYWORDS: dict[str, int] = {
    "패스트푸드": 1,
    "분식": 1,
    "버거": 1,
    "치킨": 1,
    "한식": 2,
    "일식": 2,
    "중식": 2,
    "양식": 2,
    "이탈리아": 2,
    "태국": 2,
    "인도": 2,
    "멕시코": 2,
    "프랑스": 3,
    "지중해": 3,
}


def _map_category(kakao_category_name: str) -> str:
    """Convert Kakao category string to our category key."""
    for keyword, category in _KAKAO_CATEGORY_KEYWORDS:
        if keyword in kakao_category_name:
            return category
    return "Korean"  # default fallback


def _map_price_range(kakao_category_name: str) -> int:
    for keyword, price in _PRICE_KEYWORDS.items():
        if keyword in kakao_category_name:
            return price
    return 2


def _parse_place(place: dict) -> Optional[dict]:
    """Convert a Kakao place dict into our restaurant field dict. Returns None to skip."""
    kakao_id = str(place.get("id", ""))
    name = place.get("place_name", "").strip()
    if not kakao_id or not name:
        return None

    category_name = place.get("category_name", "")
    # Skip non-restaurant entries (cafes, bars, etc.) that slipped through
    if "카페" in category_name or "술집" in category_name or "베이커리" in category_name:
        return None

    address = place.get("road_address_name") or place.get("address_name") or ""
    phone = place.get("phone", "") or ""

    try:
        lat = float(place.get("y") or 0)
        lng = float(place.get("x") or 0)
        # 0,0은 좌표 없음으로 처리
        if lat == 0.0 or lng == 0.0:
            lat, lng = None, None
    except (TypeError, ValueError):
        lat, lng = None, None

    category = _map_category(category_name)
    price_range = _map_price_range(category_name)

    return {
        "kakao_id": kakao_id,
        "name": name,
        "category": category,
        "address": address,
        "latitude": lat,
        "longitude": lng,
        "phone": phone,
        "price_range": price_range,
        "rating": 0.0,
        "description": "",
        "image_url": "",
    }


class PlaceSyncService:
    def __init__(self, db: Session, api_key: str):
        self.db = db
        self.api_key = api_key
        self.repo = RestaurantRepository(db)

    def _fetch_page(
        self,
        query: str,
        x: float,
        y: float,
        radius: int,
        page: int,
        size: int = 15,
    ) -> tuple[list[dict], bool]:
        """Fetch one page of Kakao results. Returns (documents, is_end)."""
        headers = {"Authorization": f"KakaoAK {self.api_key}"}
        params = {
            "query": query,
            "category_group_code": "FD6",
            "x": x,
            "y": y,
            "radius": radius,
            "page": page,
            "size": size,
            "sort": "distance",
        }
        resp = httpx.get(KAKAO_SEARCH_URL, headers=headers, params=params, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        documents = data.get("documents", [])
        is_end = data.get("meta", {}).get("is_end", True)
        return documents, is_end

    def sync(
        self,
        lat: float,
        lng: float,
        radius_m: int = 2000,
        max_pages: int = 5,
    ) -> dict:
        """
        Fetch restaurants near (lat, lng) within radius_m metres from Kakao
        and upsert them into the database.

        Returns a summary dict: { created, updated, skipped, errors }.
        """
        if not self.api_key:
            raise ValueError("KAKAO_API_KEY is not configured")

        counts = {"created": 0, "updated": 0, "skipped": 0, "errors": 0}

        for page in range(1, max_pages + 1):
            try:
                documents, is_end = self._fetch_page(
                    query="음식점",
                    x=lng,
                    y=lat,
                    radius=radius_m,
                    page=page,
                )
            except Exception as exc:
                raise RuntimeError(f"Kakao API request failed: {exc}") from exc

            for place in documents:
                fields = _parse_place(place)
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

            if is_end:
                break

        return counts
