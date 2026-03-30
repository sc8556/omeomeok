"""
네이버 로컬 검색 API로 식당의 리뷰 수를 가져와 naver_review_count를 채웁니다.
API 문서: https://developers.naver.com/docs/serviceapi/search/local/local.md

필요 환경변수:
  NAVER_CLIENT_ID     - 네이버 개발자센터 애플리케이션 Client ID
  NAVER_CLIENT_SECRET - Client Secret
"""
from typing import Optional
import httpx


NAVER_LOCAL_URL = "https://openapi.naver.com/v1/search/local.json"


def fetch_naver_review_count(
    name: str,
    address: str,
    client_id: str,
    client_secret: str,
) -> Optional[int]:
    """
    식당명 + 주소로 네이버 로컬 검색 후 첫 번째 결과의 리뷰 수 반환.
    결과 없거나 오류 시 None 반환.
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
            return None
        item = items[0]
        # 네이버 API 응답: reviewCount 필드 (없을 수 있음)
        review_count = item.get("reviewCount")
        if review_count is not None:
            return int(review_count)
        return None
    except Exception:
        return None
