from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.schemas.preference import PreferenceCreate, PreferenceRead
from app.services.preference_service import PreferenceService

router = APIRouter(prefix="/preferences", tags=["preferences"])


@router.post("", response_model=PreferenceRead, status_code=201)
def save_preference(data: PreferenceCreate, db: Session = Depends(get_db)):
    service = PreferenceService(db)
    return service.save(data)


@router.get("/{session_id}", response_model=PreferenceRead)
def get_preference(session_id: str, db: Session = Depends(get_db)):
    service = PreferenceService(db)
    pref = service.get_latest(session_id)
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    return pref
