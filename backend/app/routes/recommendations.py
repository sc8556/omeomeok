from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.config import get_settings
from app.core.dependencies import get_db
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse
from app.schemas.ai_recommendation import AIRecommendationRequest
from app.services.recommendation_service import RecommendationService
from app.services.ai_recommendation_service import AIRecommendationService

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("", response_model=RecommendationResponse)
def create_recommendation(request: RecommendationRequest, db: Session = Depends(get_db)):
    service = RecommendationService(db)
    items = service.generate(request)
    return RecommendationResponse(session_id=request.session_id, results=items)


@router.post("/ai", response_model=RecommendationResponse)
def create_ai_recommendation(request: AIRecommendationRequest, db: Session = Depends(get_db)):
    """Claude AI 기반 상황 맞춤 추천. ANTHROPIC_API_KEY 필요."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        raise HTTPException(status_code=503, detail="ANTHROPIC_API_KEY가 설정되지 않았습니다.")
    service = AIRecommendationService(db, api_key=settings.anthropic_api_key)
    items = service.generate(request)
    return RecommendationResponse(session_id=request.session_id, results=items)
