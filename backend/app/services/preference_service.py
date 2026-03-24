from sqlalchemy.orm import Session
from app.models.preference import Preference
from app.repositories.preference_repository import PreferenceRepository
from app.schemas.preference import PreferenceCreate


class PreferenceService:
    def __init__(self, db: Session):
        self.repo = PreferenceRepository(db)

    def save(self, data: PreferenceCreate) -> Preference:
        return self.repo.create(data)

    def get_latest(self, session_id: str):
        return self.repo.get_by_session(session_id)
