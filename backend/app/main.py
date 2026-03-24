from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import get_settings
from app.db.base import Base
from app.db.session import engine
from app.routes import health, recommendations, restaurants, preferences, history, geocode

settings = get_settings()

Base.metadata.create_all(bind=engine)

# Migrate: add kakao_id column if it doesn't exist yet
with engine.connect() as _conn:
    try:
        _conn.execute(text("ALTER TABLE restaurants ADD COLUMN kakao_id VARCHAR(50)"))
        _conn.commit()
    except Exception:
        pass  # Column already exists

app = FastAPI(
    title="Date Meal Recommender API",
    version="0.1.0",
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
