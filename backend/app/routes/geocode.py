"""
Reverse geocoding via Kakao Local API.
GET /api/v1/geocode/reverse?lat=37.56&lng=126.91
→ { "address": "서울 마포구 망원동" }
"""

import httpx
from fastapi import APIRouter, HTTPException, Query
from app.core.config import get_settings

router = APIRouter(prefix="/geocode", tags=["geocode"])

KAKAO_COORD2ADDRESS_URL = "https://dapi.kakao.com/v2/local/geo/coord2address.json"
KAKAO_KEYWORD_URL = "https://dapi.kakao.com/v2/local/search/keyword.json"


@router.get("/reverse")
def reverse_geocode(
    lat: float = Query(..., description="위도"),
    lng: float = Query(..., description="경도"),
):
    settings = get_settings()
    if not settings.kakao_api_key:
        raise HTTPException(status_code=503, detail="KAKAO_API_KEY가 설정되지 않았습니다.")

    try:
        resp = httpx.get(
            KAKAO_COORD2ADDRESS_URL,
            headers={"Authorization": f"KakaoAK {settings.kakao_api_key}"},
            params={"x": lng, "y": lat, "input_coord": "WGS84"},
            timeout=5,
        )
        resp.raise_for_status()
        documents = resp.json().get("documents", [])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"카카오 API 오류: {exc}")

    if not documents:
        raise HTTPException(status_code=404, detail="주소를 찾을 수 없습니다.")

    doc = documents[0]
    addr = doc.get("address") or {}

    parts = [
        addr.get("region_1depth_name", ""),
        addr.get("region_2depth_name", ""),
        addr.get("region_3depth_name", ""),
    ]
    address_str = " ".join(p for p in parts if p)

    return {"address": address_str or addr.get("address_name", "")}


@router.get("/search")
def search_location(query: str = Query(..., min_length=1, description="검색할 장소명 또는 주소")):
    """키워드로 장소를 검색하고 좌표를 반환합니다. (예: 홍대, 강남역, 서울 마포구)"""
    settings = get_settings()
    if not settings.kakao_api_key:
        raise HTTPException(status_code=503, detail="KAKAO_API_KEY가 설정되지 않았습니다.")

    try:
        resp = httpx.get(
            KAKAO_KEYWORD_URL,
            headers={"Authorization": f"KakaoAK {settings.kakao_api_key}"},
            params={"query": query, "size": 5},
            timeout=5,
        )
        resp.raise_for_status()
        documents = resp.json().get("documents", [])
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"카카오 API 오류: {exc}")

    results = []
    for doc in documents:
        try:
            lat = float(doc.get("y") or 0)
            lng = float(doc.get("x") or 0)
            if not lat or not lng:
                continue
        except (TypeError, ValueError):
            continue
        results.append({
            "name": doc.get("place_name", ""),
            "address": doc.get("road_address_name") or doc.get("address_name") or "",
            "lat": lat,
            "lng": lng,
        })

    return results
