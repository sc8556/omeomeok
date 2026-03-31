export interface Restaurant {
  id: number;
  name: string;
  category: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  price_range: number; // 1=budget, 2=mid, 3=upscale
  rating: number;
  description?: string;
  phone?: string;
  image_url?: string;
  place_url?: string;
  naver_review_count: number;
  naver_place_url?: string;
  // 상세 화면용 (GET /restaurants/:id 에서만 제공)
  user_rating_avg?: number;
  user_rating_count?: number;
}

export interface UserRatingCreate {
  session_id: string;
  restaurant_id: number;
  overall: number;         // 1–5
  ambiance?: number;       // 1–5
  date_friendly?: number;  // 1–5
}

export interface UserRatingRead extends UserRatingCreate {
  id: number;
  created_at: string;
}

export interface RestaurantRatingSummary {
  restaurant_id: number;
  avg_overall: number;
  avg_ambiance?: number;
  avg_date_friendly?: number;
  count: number;
}

export interface AIRecommendationRequest {
  session_id: string;
  context: string;
  food_types: string[];
  budget?: number;
  location_lat?: string;
  location_lng?: string;
  distance_km: number;
}

export interface RecommendationItem {
  id: number;
  restaurant: Restaurant;
  reason?: string;
  score: number;
  created_at: string;
}

export interface RecommendationRequest {
  session_id: string;
  mood?: string;
  budget?: number;
  food_types: string[];
  location_lat?: string;
  location_lng?: string;
  distance_km: number;
}

export interface RecommendationResponse {
  session_id: string;
  results: RecommendationItem[];
}

export interface HistoryResponse {
  session_id: string;
  items: RecommendationItem[];
  total: number;
}

export interface LocationSuggestion {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface Preference {
  id: number;
  session_id: string;
  mood?: string;
  budget?: number;
  food_types: string[];
  location_lat?: string;
  location_lng?: string;
  distance_km: number;
}
