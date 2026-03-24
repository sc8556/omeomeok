from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("", response_model=RecommendationResponse)
def create_recommendation(request: RecommendationRequest, db: Session = Depends(get_db)):
    service = RecommendationService(db)
    items = service.generate(request)
    return RecommendationResponse(session_id=request.session_id, results=items)
