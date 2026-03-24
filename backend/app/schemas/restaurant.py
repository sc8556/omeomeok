from pydantic import BaseModel
from typing import Optional


class RestaurantBase(BaseModel):
    name: str
    category: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    price_range: int = 2
    rating: float = 0.0
    description: Optional[str] = None
    phone: Optional[str] = None
    image_url: Optional[str] = None


class RestaurantCreate(RestaurantBase):
    pass


class RestaurantRead(RestaurantBase):
    id: int

    model_config = {"from_attributes": True}
