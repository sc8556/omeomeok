from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.models.recommendation import Recommendation
from app.models.restaurant import Restaurant
from app.repositories.restaurant_repository import RestaurantRepository
from app.repositories.recommendation_repository import RecommendationRepository
from app.repositories.preference_repository import PreferenceRepository
from app.repositories.user_rating_repository import UserRatingRepository
from app.schemas.recommendation import RecommendationRequest
from app.utils.helpers import haversine_distance


class RecommendationService:
    def __init__(self, db: Session):
        self.restaurant_repo = RestaurantRepository(db)
        self.recommendation_repo = RecommendationRepository(db)
        self.preference_repo = PreferenceRepository(db)
        self.user_rating_repo = UserRatingRepository(db)

    def generate(self, request: RecommendationRequest) -> List[Recommendation]:
        restaurants = self.restaurant_repo.get_all(limit=2000)

        user_lat, user_lng = self._parse_coords(request.location_lat, request.location_lng)

        # Step 1: filter by distance (only when user coordinates are available)
        candidates = self._filter_by_distance(restaurants, user_lat, user_lng, request.distance_km)

        # Step 2: bulk fetch user ratings for candidates
        candidate_ids = [r.id for r in candidates]
        user_ratings = self.user_rating_repo.get_avg_ratings_bulk(candidate_ids)

        # Step 3: score remaining candidates
        scored = self._score_restaurants(candidates, request, user_lat, user_lng, user_ratings)
        top = sorted(scored, key=lambda x: x[1], reverse=True)[:30]

        records = [
            Recommendation(
                session_id=request.session_id,
                restaurant_id=r.id,
                reason=self._build_reason(r, request, dist_km, user_ratings),
                score=score,
                context_snapshot=request.model_dump(),
            )
            for r, score, dist_km in top
        ]

        return self.recommendation_repo.create_bulk(records)

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #

    _MOOD_PROFILE: dict = {
        "romantic":    {"price_ranges": [2, 3], "bonus": 25, "penalty": 30},
        "special":     {"price_ranges": [3],    "bonus": 30, "penalty": 35},
        "casual":      {"price_ranges": [1, 2], "bonus": 20, "penalty": 25},
        "adventurous": {"price_ranges": [1, 2, 3], "bonus": 10, "penalty": 0},
        "cozy":        {"price_ranges": [1, 2], "bonus": 20, "penalty": 25},
    }

    @staticmethod
    def _parse_coords(
        lat_str: Optional[str], lng_str: Optional[str]
    ) -> Tuple[Optional[float], Optional[float]]:
        try:
            if lat_str and lng_str:
                return float(lat_str), float(lng_str)
        except (ValueError, TypeError):
            pass
        return None, None

    @staticmethod
    def _has_valid_coords(r: Restaurant) -> bool:
        """좌표가 유효한지 확인 (null 또는 0,0 제외)"""
        if r.latitude is None or r.longitude is None:
            return False
        # 0,0 은 Kakao API 파싱 실패 시 기본값으로, 유효하지 않음
        if r.latitude == 0.0 and r.longitude == 0.0:
            return False
        return True

    @staticmethod
    def _filter_by_distance(
        restaurants: List[Restaurant],
        user_lat: Optional[float],
        user_lng: Optional[float],
        distance_km: int,
    ) -> List[Restaurant]:
        if user_lat is None or user_lng is None:
            return restaurants

        result = []
        for r in restaurants:
            if not RecommendationService._has_valid_coords(r):
                continue
            dist = haversine_distance(user_lat, user_lng, r.latitude, r.longitude)
            if dist <= distance_km:
                result.append(r)

        # 반경 내 식당이 없으면 빈 리스트 반환 → 프론트에서 "근처 맛집 없음" 표시
        return result

    def _score_restaurants(
        self,
        restaurants: List[Restaurant],
        request: RecommendationRequest,
        user_lat: Optional[float],
        user_lng: Optional[float],
        user_ratings: Dict[int, Tuple[float, int]] = {},
    ) -> List[Tuple[Restaurant, int, Optional[float]]]:
        mood_profile = self._MOOD_PROFILE.get(request.mood or "", {})
        results = []

        for r in restaurants:
            score = 40

            # Food type match
            if request.food_types and r.category in request.food_types:
                score += 30

            # Budget fit
            if request.budget:
                if request.budget <= 15000 and r.price_range == 1:
                    score += 15
                elif request.budget < 40000 and r.price_range <= 2:
                    score += 15
                elif r.price_range <= 3:
                    score += 15

            # Mood fit: bonus for match, penalty for mismatch
            if mood_profile:
                if r.price_range in mood_profile.get("price_ranges", []):
                    score += mood_profile.get("bonus", 0)
                else:
                    score -= mood_profile.get("penalty", 0)

            # 사용자 평점 보너스 (앱 내 평점 우선, 없으면 카카오 rating 사용)
            avg_user_rating, rating_count = user_ratings.get(r.id, (0.0, 0))
            if rating_count > 0:
                # 앱 사용자 평점: 최대 15점 (높은 신뢰도)
                if avg_user_rating >= 4.5:
                    score += 15
                elif avg_user_rating >= 4.0:
                    score += 10
                elif avg_user_rating >= 3.5:
                    score += 5
                elif avg_user_rating < 2.5:
                    score -= 10  # 낮은 평점 페널티
            else:
                # 카카오 외부 평점 (up to 10 pts)
                score += int((r.rating or 0.0) * 2)

            # 네이버 리뷰수 보너스 (최대 8점)
            naver_count = r.naver_review_count or 0
            if naver_count >= 500:
                score += 8
            elif naver_count >= 200:
                score += 5
            elif naver_count >= 50:
                score += 3

            # Distance proximity bonus
            dist_km: Optional[float] = None
            if user_lat is not None and user_lng is not None:
                if self._has_valid_coords(r):
                    dist_km = haversine_distance(user_lat, user_lng, r.latitude, r.longitude)
                    if dist_km <= 1:
                        score += 10
                    elif dist_km <= 3:
                        score += 6
                    elif dist_km <= 5:
                        score += 3

            results.append((r, min(score, 100), dist_km))

        return results

    _MOOD_LABELS: dict = {
        "romantic": "로맨틱한",
        "special": "특별한",
        "casual": "가벼운",
        "adventurous": "새로운",
        "cozy": "아늑한",
    }

    _FOOD_TYPE_LABELS: dict = {
        "Korean": "한식", "Japanese": "일식", "Italian": "이탈리안",
        "Chinese": "중식", "Mexican": "멕시칸", "American": "양식",
        "French": "프렌치", "Indian": "인도", "Thai": "태국",
        "Mediterranean": "지중해",
    }

    def _build_reason(
        self,
        restaurant: Restaurant,
        request: RecommendationRequest,
        dist_km: Optional[float],
        user_ratings: Dict[int, Tuple[float, int]] = {},
    ) -> str:
        parts = []

        if request.food_types and restaurant.category in request.food_types:
            label = self._FOOD_TYPE_LABELS.get(restaurant.category, restaurant.category)
            parts.append(f"{label} 취향에 딱 맞아요")

        if request.mood and restaurant.price_range in self._MOOD_PROFILE.get(
            request.mood, {}
        ).get("price_ranges", []):
            mood_label = self._MOOD_LABELS.get(request.mood, "")
            if mood_label:
                parts.append(f"{mood_label} 분위기에 어울려요")

        # 사용자 평점 우선 표시
        avg_user_rating, rating_count = user_ratings.get(restaurant.id, (0.0, 0))
        if rating_count > 0:
            if avg_user_rating >= 4.5:
                parts.append(f"앱 평점 {avg_user_rating:.1f}★ ({rating_count}명)")
            elif avg_user_rating >= 4.0:
                parts.append(f"앱 평점 {avg_user_rating:.1f}★")
        elif restaurant.rating >= 4.5:
            parts.append("최고 평점")
        elif restaurant.rating >= 4.0:
            parts.append("높은 평점")

        if (restaurant.naver_review_count or 0) >= 200:
            parts.append(f"네이버 리뷰 {restaurant.naver_review_count}개")

        if dist_km is not None:
            if dist_km < 1:
                parts.append(f"{dist_km * 1000:.0f}m 거리")
            else:
                parts.append(f"{dist_km:.1f}km 거리")

        if not parts:
            parts.append("주변 인기 맛집")

        return ", ".join(parts)
