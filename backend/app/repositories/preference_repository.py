from typing import Optional
from sqlalchemy.orm import Session
from app.models.preference import Preference
from app.schemas.preference import PreferenceCreate


class PreferenceRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_session(self, session_id: str) -> Optional[Preference]:
        return (
            self.db.query(Preference)
            .filter(Preference.session_id == session_id)
            .order_by(Preference.id.desc())
            .first()
        )

    def create(self, data: PreferenceCreate) -> Preference:
        preference = Preference(**data.model_dump())
        self.db.add(preference)
        self.db.commit()
        self.db.refresh(preference)
        return preference
