from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.routes import health, recommendations, restaurants, preferences, history, geocode
from app.routes import ratings

settings = get_settings()

# UserRating 모델 등록을 위해 임포트
import app.models.user_rating  # noqa: F401

Base.metadata.create_all(bind=engine)

# 기존 DB에 새 컬럼 추가 (없을 때만)
_is_sqlite = str(engine.url).startswith("sqlite")
with engine.connect() as _conn:
    if _is_sqlite:
        for stmt in [
            "ALTER TABLE restaurants ADD COLUMN place_url VARCHAR(500)",
            "ALTER TABLE restaurants ADD COLUMN naver_review_count INTEGER DEFAULT 0",
        ]:
            try:
                _conn.execute(text(stmt))
                _conn.commit()
            except Exception:
                pass
    else:
        for stmt in [
            "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS place_url VARCHAR(500)",
            "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS naver_review_count INTEGER DEFAULT 0",
            "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS naver_place_url VARCHAR(500)",
            "CREATE INDEX IF NOT EXISTS idx_restaurants_lat ON restaurants (latitude)",
            "CREATE INDEX IF NOT EXISTS idx_restaurants_lng ON restaurants (longitude)",
        ]:
            _conn.execute(text(stmt))
            _conn.commit()

app = FastAPI(
    title="Date Meal Recommender API",
    version="0.2.0",
    description="Backend API for the Date Meal Recommender mobile app",
)

_origins = settings.allowed_origins
_wildcard = "*" in _origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if _wildcard else _origins,
    allow_credentials=False if _wildcard else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(recommendations.router, prefix="/api/v1")
app.include_router(restaurants.router, prefix="/api/v1")
app.include_router(preferences.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(geocode.router, prefix="/api/v1")
app.include_router(ratings.router, prefix="/api/v1")
