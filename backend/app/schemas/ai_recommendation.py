from pydantic import BaseModel
from typing import List, Optional


class AIRecommendationRequest(BaseModel):
    session_id: str
    context: str                       # 사용자 자유 입력 (예: "100일 기념일, 분위기 좋은 곳")
    food_types: List[str] = []
    budget: Optional[int] = None
    location_lat: Optional[str] = None
    location_lng: Optional[str] = None
    distance_km: int = 5
