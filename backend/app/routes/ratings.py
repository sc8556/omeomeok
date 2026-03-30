from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.schemas.user_rating import UserRatingCreate, UserRatingRead, RestaurantRatingSummary
from app.repositories.user_rating_repository import UserRatingRepository
from app.repositories.restaurant_repository import RestaurantRepository

router = APIRouter(prefix="/ratings", tags=["ratings"])


@router.post("", response_model=UserRatingRead)
def submit_rating(data: UserRatingCreate, db: Session = Depends(get_db)):
    """사용자 평점 제출 (세션당 식당 1개, upsert)"""
    if not RestaurantRepository(db).get_by_id(data.restaurant_id):
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return UserRatingRepository(db).upsert(
        data.session_id,
        data.restaurant_id,
        data.overall,
        data.ambiance,
        data.date_friendly,
    )


@router.get("/summary/{restaurant_id}", response_model=RestaurantRatingSummary)
def get_restaurant_rating_summary(restaurant_id: int, db: Session = Depends(get_db)):
    """식당 전체 사용자 평점 집계"""
    summary = UserRatingRepository(db).get_summary(restaurant_id)
    return RestaurantRatingSummary(restaurant_id=restaurant_id, **summary)


@router.get("/user/{session_id}/{restaurant_id}", response_model=Optional[UserRatingRead])
def get_user_rating(session_id: str, restaurant_id: int, db: Session = Depends(get_db)):
    """세션의 특정 식당 평점 조회 (없으면 null)"""
    return UserRatingRepository(db).get_user_rating(session_id, restaurant_id)
