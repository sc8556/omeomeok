from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.restaurant import RestaurantRead


class RecommendationRequest(BaseModel):
    session_id: str
    mood: Optional[str] = None
    budget: Optional[int] = None
    food_types: List[str] = []
    location_lat: Optional[str] = None
    location_lng: Optional[str] = None
    distance_km: int = 5


class RecommendationItem(BaseModel):
    id: int
    restaurant: RestaurantRead
    reason: Optional[str] = None
    score: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RecommendationResponse(BaseModel):
    session_id: str
    results: List[RecommendationItem]
