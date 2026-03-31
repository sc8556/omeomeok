"""
Claude API를 이용한 컨텍스트 기반 맛집 추천 서비스.

사용자 자유 입력(예: "100일 기념일, 조용한 곳")을 받아
근처 식당 목록과 함께 Claude에게 전달하고 추천 결과를 받습니다.
"""
import json
import math
import re
from typing import List, Optional, Tuple
import anthropic
from sqlalchemy.orm import Session

from app.models.recommendation import Recommendation
from app.models.restaurant import Restaurant
from app.repositories.restaurant_repository import RestaurantRepository
from app.repositories.recommendation_repository import RecommendationRepository
from app.repositories.user_rating_repository import UserRatingRepository
from app.schemas.ai_recommendation import AIRecommendationRequest
from app.schemas.recommendation import RecommendationRequest
from app.services.recommendation_service import RecommendationService
from app.utils.helpers import haversine_distance


class AIRecommendationService:
    def __init__(self, db: Session, api_key: str):
        self.db = db
        self.client = anthropic.Anthropic(api_key=api_key)
        self.restaurant_repo = RestaurantRepository(db)
        self.recommendation_repo = RecommendationRepository(db)
        self.user_rating_repo = UserRatingRepository(db)

    def generate(self, request: AIRecommendationRequest) -> List[Recommendation]:
        # Step 1: 위치 기준으로 후보 식당 필터링 (기존 서비스 로직 재사용)
        base_request = RecommendationRequest(
            session_id=request.session_id,
            food_types=request.food_types,
            budget=request.budget,
            location_lat=request.location_lat,
            location_lng=request.location_lng,
            distance_km=request.distance_km,
        )
        base_service = RecommendationService(self.db)
        user_lat, user_lng = base_service._parse_coords(request.location_lat, request.location_lng)

        if user_lat is not None and user_lng is not None:
            lat_delta = request.distance_km / 111.0
            lng_delta = request.distance_km / (111.0 * max(math.cos(math.radians(user_lat)), 0.01))
            all_restaurants = self.restaurant_repo.get_within_bounds(
                lat_min=user_lat - lat_delta,
                lat_max=user_lat + lat_delta,
                lng_min=user_lng - lng_delta,
                lng_max=user_lng + lng_delta,
            )
        else:
            all_restaurants = self.restaurant_repo.get_all(limit=2000)
        candidates = base_service._filter_by_distance(
            all_restaurants, user_lat, user_lng, request.distance_km
        )

        if not candidates:
            return []

        # Step 2: 사용자 평점 조회
        candidate_ids = [r.id for r in candidates]
        user_ratings = self.user_rating_repo.get_avg_ratings_bulk(candidate_ids)

        # Step 3: 거리 계산 후 후보 상위 30개로 압축
        scored_candidates = []
        for r in candidates:
            dist_km = None
            if user_lat and user_lng and base_service._has_valid_coords(r):
                dist_km = haversine_distance(user_lat, user_lng, r.latitude, r.longitude)
            user_avg, user_count = user_ratings.get(r.id, (0.0, 0))
            scored_candidates.append((r, dist_km, user_avg, user_count))

        scored_candidates.sort(key=lambda x: (x[1] or 999))
        top_candidates = scored_candidates[:30]

        # Step 4: Claude에게 전달할 식당 목록 구성
        restaurant_list = self._build_restaurant_list(top_candidates)

        # Step 5: Claude API 호출
        try:
            selected = self._call_claude(request.context, restaurant_list, request)
        except Exception:
            # Claude 실패 시 기존 알고리즘으로 폴백
            return base_service.generate(base_request)

        # Step 6: Claude 선택 결과를 Recommendation 레코드로 저장
        records = []
        for item in selected:
            restaurant = next((r for r, *_ in top_candidates if r.id == item["id"]), None)
            if not restaurant:
                continue
            dist_km = next((d for r, d, *_ in top_candidates if r.id == item["id"]), None)
            records.append(
                Recommendation(
                    session_id=request.session_id,
                    restaurant_id=restaurant.id,
                    reason=item.get("reason", "AI 추천"),
                    score=item.get("score", 80),
                    context_snapshot={"ai_context": request.context, **base_request.model_dump()},
                )
            )

        if not records:
            return base_service.generate(base_request)

        return self.recommendation_repo.create_bulk(records)

    def _build_restaurant_list(
        self, candidates: List[Tuple]
    ) -> List[dict]:
        result = []
        for r, dist_km, user_avg, user_count in candidates:
            entry = {
                "id": r.id,
                "name": r.name,
                "category": r.category,
                "price_range": r.price_range,
                "address": r.address or "",
                "distance_km": round(dist_km, 2) if dist_km else None,
            }
            if user_count > 0:
                entry["user_rating"] = f"{user_avg:.1f} ({user_count}명)"
            elif r.rating > 0:
                entry["rating"] = r.rating
            if r.naver_review_count and r.naver_review_count > 0:
                entry["naver_reviews"] = r.naver_review_count
            result.append(entry)
        return result

    def _call_claude(
        self,
        context: str,
        restaurant_list: List[dict],
        request: AIRecommendationRequest,
    ) -> List[dict]:
        price_labels = {1: "저렴", 2: "보통", 3: "고급"}
        budget_str = f"{request.budget:,}원" if request.budget else "제한 없음"
        food_str = ", ".join(request.food_types) if request.food_types else "모두"

        system_prompt = """당신은 데이트 맛집 전문 추천 AI입니다.
주어진 식당 목록에서 사용자의 상황에 가장 잘 맞는 최대 5개를 선택하고,
반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

[
  {"id": <식당ID>, "score": <60-100 정수>, "reason": "<한국어로 50자 이내 추천 이유>"},
  ...
]"""

        user_message = f"""사용자 상황: {context}

조건:
- 음식 종류: {food_str}
- 예산 (1인): {budget_str}
- 거리 내 식당 목록 (가까운 순):

{json.dumps(restaurant_list, ensure_ascii=False, indent=2)}

위 조건과 상황에 가장 어울리는 식당 최대 5개를 JSON 배열로 반환하세요."""

        message = self.client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        raw = message.content[0].text.strip()
        # Claude가 마크다운 코드블록으로 감싸는 경우 제거
        raw = re.sub(r"```(?:json)?\s*", "", raw).strip()
        return json.loads(raw)
