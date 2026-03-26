from sqlalchemy import Column, Integer, String, Float, Text
from sqlalchemy.orm import relationship
from app.db.base import Base


class Restaurant(Base):
    __tablename__ = "restaurants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    address = Column(String(500))
    latitude = Column(Float)
    longitude = Column(Float)
    price_range = Column(Integer, default=2)  # 1=budget, 2=mid, 3=upscale
    rating = Column(Float, default=0.0)
    description = Column(Text)
    phone = Column(String(50))
    image_url = Column(String(500))
    place_url = Column(String(500))
    kakao_id = Column(String(50), unique=True, nullable=True, index=True)

    recommendations = relationship("Recommendation", back_populates="restaurant")
