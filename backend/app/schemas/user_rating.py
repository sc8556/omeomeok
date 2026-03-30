from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class UserRatingCreate(BaseModel):
    session_id: str
    restaurant_id: int
    overall: float = Field(..., ge=1.0, le=5.0)
    ambiance: Optional[float] = Field(None, ge=1.0, le=5.0)
    date_friendly: Optional[float] = Field(None, ge=1.0, le=5.0)


class UserRatingRead(BaseModel):
    id: int
    session_id: str
    restaurant_id: int
    overall: float
    ambiance: Optional[float]
    date_friendly: Optional[float]
    created_at: datetime

    model_config = {"from_attributes": True}


class RestaurantRatingSummary(BaseModel):
    restaurant_id: int
    avg_overall: float
    avg_ambiance: Optional[float]
    avg_date_friendly: Optional[float]
    count: int
