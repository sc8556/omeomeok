from sqlalchemy import Column, Integer, String, JSON
from app.db.base import Base


class Preference(Base):
    __tablename__ = "preferences"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(100), nullable=False, index=True)
    mood = Column(String(100))
    budget = Column(Integer)  # budget in KRW
    food_types = Column(JSON, default=list)  # e.g. ["Korean", "Italian"]
    location_lat = Column(String(50))
    location_lng = Column(String(50))
    distance_km = Column(Integer, default=5)
