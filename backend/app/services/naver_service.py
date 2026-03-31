"""
네이버 로컬 검색 API로 식당의 리뷰 수와 플레이스 URL을 가져옵니다.
API 문서: https://developers.naver.com/docs/serviceapi/search/local/local.md

필요 환경변수:
  NAVER_CLIENT_ID     - 네이버 개발자센터 애플리케이션 Client ID
  NAVER_CLIENT_SECRET - Client Secret
"""
from typing import Optional, Tuple
import httpx


NAVER_LOCAL_URL = "https://openapi.naver.com/v1/search/local.json"


def fetch_naver_info(
    name: str,
    address: str,
    client_id: str,
    client_secret: str,
) -> Tuple[Optional[int], Optional[str]]:
    """
    식당명 + 주소로 네이버 로컬 검색 후 (리뷰수, 플레이스URL) 반환.
    결과 없거나 오류 시 (None, None) 반환.
    """
    query = f"{name} {address[:20] if address else ''}".strip()
    try:
        resp = httpx.get(
            NAVER_LOCAL_URL,
            params={"query": query, "display": 1},
            headers={
                "X-Naver-Client-Id": client_id,
                "X-Naver-Client-Secret": client_secret,
            },
            timeout=5.0,
        )
        resp.raise_for_status()
        items = resp.json().get("items", [])
        if not items:
            return None, None
        item = items[0]

        review_count: Optional[int] = None
        rc = item.get("reviewCount")
        if rc is not None:
            review_count = int(rc)

        # link 필드: 네이버 플레이스 URL (메뉴 정보 포함)
        place_url: Optional[str] = item.get("link") or None

        return review_count, place_url
    except Exception:
        return None, None


def fetch_naver_review_count(
    name: str,
    address: str,
    client_id: str,
    client_secret: str,
) -> Optional[int]:
    """하위 호환용 래퍼 — 리뷰 수만 반환."""
    count, _ = fetch_naver_info(name, address, client_id, client_secret)
    return count
