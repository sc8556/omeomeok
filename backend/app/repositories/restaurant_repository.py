from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.restaurant import Restaurant
from app.schemas.restaurant import RestaurantCreate


class RestaurantRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_all(self, skip: int = 0, limit: int = 100) -> List[Restaurant]:
        return self.db.query(Restaurant).offset(skip).limit(limit).all()

    def get_by_id(self, restaurant_id: int) -> Optional[Restaurant]:
        return self.db.query(Restaurant).filter(Restaurant.id == restaurant_id).first()

    def get_by_kakao_id(self, kakao_id: str) -> Optional[Restaurant]:
        return self.db.query(Restaurant).filter(Restaurant.kakao_id == kakao_id).first()

    def get_by_category(self, category: str) -> List[Restaurant]:
        return self.db.query(Restaurant).filter(Restaurant.category == category).all()

    def create(self, data: RestaurantCreate) -> Restaurant:
        restaurant = Restaurant(**data.model_dump())
        self.db.add(restaurant)
        self.db.commit()
        self.db.refresh(restaurant)
        return restaurant

    def upsert_from_kakao(self, fields: dict) -> tuple[Restaurant, bool]:
        """Insert or update a restaurant keyed by kakao_id. Returns (restaurant, created)."""
        kakao_id = fields["kakao_id"]
        existing = self.get_by_kakao_id(kakao_id)
        if existing:
            for key, value in fields.items():
                setattr(existing, key, value)
            self.db.commit()
            self.db.refresh(existing)
            return existing, False
        restaurant = Restaurant(**fields)
        self.db.add(restaurant)
        self.db.commit()
        self.db.refresh(restaurant)
        return restaurant, True

    def delete(self, restaurant_id: int) -> bool:
        restaurant = self.get_by_id(restaurant_id)
        if not restaurant:
            return False
        self.db.delete(restaurant)
        self.db.commit()
        return True
