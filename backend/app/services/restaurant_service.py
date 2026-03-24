from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.restaurant import Restaurant
from app.repositories.restaurant_repository import RestaurantRepository
from app.schemas.restaurant import RestaurantCreate


class RestaurantService:
    def __init__(self, db: Session):
        self.repo = RestaurantRepository(db)

    def list_all(self, skip: int = 0, limit: int = 100) -> List[Restaurant]:
        return self.repo.get_all(skip=skip, limit=limit)

    def get_detail(self, restaurant_id: int) -> Optional[Restaurant]:
        return self.repo.get_by_id(restaurant_id)

    def create(self, data: RestaurantCreate) -> Restaurant:
        return self.repo.create(data)
