from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base


class UserRating(Base):
    __tablename__ = "user_ratings"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.id"), nullable=False)
    overall = Column(Float, nullable=False)       # 1.0–5.0 종합 평점
    ambiance = Column(Float, nullable=True)        # 1.0–5.0 분위기
    date_friendly = Column(Float, nullable=True)   # 1.0–5.0 데이트 적합도
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("session_id", "restaurant_id", name="uq_user_rating_session_restaurant"),
    )

    restaurant = relationship("Restaurant", back_populates="user_ratings")
