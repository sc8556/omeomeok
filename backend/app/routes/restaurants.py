from typing import List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.dependencies import get_db
from app.schemas.restaurant import RestaurantCreate, RestaurantRead
from app.services.restaurant_service import RestaurantService
from app.services.place_sync_service import PlaceSyncService
from app.services.seoul_sync_service import SeoulSyncService

router = APIRouter(prefix="/restaurants", tags=["restaurants"])


@router.get("", response_model=List[RestaurantRead])
def list_restaurants(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    service = RestaurantService(db)
    return service.list_all(skip=skip, limit=limit)


@router.get("/{restaurant_id}", response_model=RestaurantRead)
def get_restaurant(restaurant_id: int, db: Session = Depends(get_db)):
    service = RestaurantService(db)
    restaurant = service.get_detail(restaurant_id)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return restaurant


@router.post("", response_model=RestaurantRead, status_code=201)
def create_restaurant(data: RestaurantCreate, db: Session = Depends(get_db)):
    service = RestaurantService(db)
    return service.create(data)


class SyncRequest(BaseModel):
    lat: float = Field(..., description="위도 (latitude)")
    lng: float = Field(..., description="경도 (longitude)")
    radius_m: int = Field(2000, ge=100, le=20000, description="검색 반경 (미터)")
    max_pages: int = Field(5, ge=1, le=45, description="최대 페이지 수 (페이지당 최대 15개)")


class SyncResult(BaseModel):
    created: int
    updated: int
    skipped: int
    errors: int


@router.post("/sync", response_model=SyncResult)
def sync_from_kakao(body: SyncRequest, db: Session = Depends(get_db)):
    """카카오 로컬 API에서 주변 음식점을 가져와 DB에 동기화합니다."""
    settings = get_settings()
    if not settings.kakao_api_key:
        raise HTTPException(status_code=503, detail="KAKAO_API_KEY가 설정되지 않았습니다.")
    try:
        service = PlaceSyncService(db, api_key=settings.kakao_api_key)
        result = service.sync(
            lat=body.lat,
            lng=body.lng,
            radius_m=body.radius_m,
            max_pages=body.max_pages,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return SyncResult(**result)


class SeoulSyncRequest(BaseModel):
    gu: str = Field(None, description="특정 구 이름 (예: 강남구). 비우면 전체.")
    max_records: int = Field(1000, ge=100, le=10000, description="최대 조회 건수")
    page_size: int = Field(500, ge=100, le=1000, description="페이지당 건수")


@router.post("/sync/seoul", response_model=SyncResult)
def sync_from_seoul(body: SeoulSyncRequest, db: Session = Depends(get_db)):
    """서울시 열린 데이터 광장 일반음식점 API에서 음식점을 가져와 DB에 동기화합니다."""
    settings = get_settings()
    if not settings.seoul_api_key:
        raise HTTPException(status_code=503, detail="SEOUL_API_KEY가 설정되지 않았습니다.")
    try:
        service = SeoulSyncService(db, api_key=settings.seoul_api_key)
        result = service.sync(
            gu=body.gu or None,
            max_records=body.max_records,
            page_size=body.page_size,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    return SyncResult(**result)
