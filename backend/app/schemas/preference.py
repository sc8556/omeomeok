from pydantic import BaseModel
from typing import Optional, List


class PreferenceCreate(BaseModel):
    session_id: str
    mood: Optional[str] = None
    budget: Optional[int] = None
    food_types: List[str] = []
    location_lat: Optional[str] = None
    location_lng: Optional[str] = None
    distance_km: int = 5


class PreferenceRead(PreferenceCreate):
    id: int

    model_config = {"from_attributes": True}
