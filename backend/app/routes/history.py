from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.schemas.history import HistoryResponse
from app.repositories.recommendation_repository import RecommendationRepository

router = APIRouter(prefix="/history", tags=["history"])


@router.get("/{session_id}", response_model=HistoryResponse)
def get_history(session_id: str, db: Session = Depends(get_db)):
    repo = RecommendationRepository(db)
    items = repo.get_by_session(session_id)
    return HistoryResponse(session_id=session_id, items=items, total=len(items))
