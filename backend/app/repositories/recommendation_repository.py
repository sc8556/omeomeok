from typing import List
from sqlalchemy.orm import Session, joinedload
from app.models.recommendation import Recommendation


class RecommendationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_session(self, session_id: str) -> List[Recommendation]:
        return (
            self.db.query(Recommendation)
            .options(joinedload(Recommendation.restaurant))
            .filter(Recommendation.session_id == session_id)
            .order_by(Recommendation.created_at.desc())
            .all()
        )

    def create_bulk(self, records: List[Recommendation]) -> List[Recommendation]:
        self.db.add_all(records)
        self.db.commit()
        for r in records:
            self.db.refresh(r)
        return records
