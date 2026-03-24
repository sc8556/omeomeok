from pydantic import BaseModel
from typing import List
from app.schemas.recommendation import RecommendationItem


class HistoryResponse(BaseModel):
    session_id: str
    items: List[RecommendationItem]
    total: int
