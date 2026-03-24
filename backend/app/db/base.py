from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Import all models here so Alembic and create_all() can discover them
from app.models import restaurant, recommendation, preference  # noqa: F401, E402
