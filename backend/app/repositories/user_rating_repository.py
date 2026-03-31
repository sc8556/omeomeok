from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.user_rating import UserRating


class UserRatingRepository:
    def __init__(self, db: Session):
        self.db = db

    def upsert(
        self,
        session_id: str,
        restaurant_id: int,
        overall: float,
        ambiance: Optional[float],
        date_friendly: Optional[float],
    ) -> UserRating:
        existing = (
            self.db.query(UserRating)
            .filter(
                UserRating.session_id == session_id,
                UserRating.restaurant_id == restaurant_id,
            )
            .first()
        )
        if existing:
            existing.overall = overall
            existing.ambiance = ambiance
            existing.date_friendly = date_friendly
            self.db.commit()
            self.db.refresh(existing)
            return existing
        rating = UserRating(
            session_id=session_id,
            restaurant_id=restaurant_id,
            overall=overall,
            ambiance=ambiance,
            date_friendly=date_friendly,
        )
        self.db.add(rating)
        self.db.commit()
        self.db.refresh(rating)
        return rating

    def get_summary(self, restaurant_id: int) -> dict:
        result = (
            self.db.query(
                func.avg(UserRating.overall).label("avg_overall"),
                func.avg(UserRating.ambiance).label("avg_ambiance"),
                func.avg(UserRating.date_friendly).label("avg_date_friendly"),
                func.count(UserRating.id).label("count"),
            )
            .filter(UserRating.restaurant_id == restaurant_id)
            .first()
        )
        return {
            "avg_overall": round(float(result.avg_overall or 0.0), 2),
            "avg_ambiance": round(float(result.avg_ambiance), 2) if result.avg_ambiance else None,
            "avg_date_friendly": round(float(result.avg_date_friendly), 2) if result.avg_date_friendly else None,
            "count": result.count or 0,
        }

    def get_user_rating(self, session_id: str, restaurant_id: int) -> Optional[UserRating]:
        return (
            self.db.query(UserRating)
            .filter(
                UserRating.session_id == session_id,
                UserRating.restaurant_id == restaurant_id,
            )
            .first()
        )

    def delete(self, session_id: str, restaurant_id: int) -> bool:
        existing = (
            self.db.query(UserRating)
            .filter(
                UserRating.session_id == session_id,
                UserRating.restaurant_id == restaurant_id,
            )
            .first()
        )
        if not existing:
            return False
        self.db.delete(existing)
        self.db.commit()
        return True

    def get_avg_ratings_bulk(self, restaurant_ids: List[int]) -> Dict[int, Tuple[float, int]]:
        """restaurant_id → (avg_overall, count) 딕셔너리 반환"""
        if not restaurant_ids:
            return {}
        results = (
            self.db.query(
                UserRating.restaurant_id,
                func.avg(UserRating.overall).label("avg_overall"),
                func.count(UserRating.id).label("count"),
            )
            .filter(UserRating.restaurant_id.in_(restaurant_ids))
            .group_by(UserRating.restaurant_id)
            .all()
        )
        return {r.restaurant_id: (float(r.avg_overall or 0.0), r.count) for r in results}
