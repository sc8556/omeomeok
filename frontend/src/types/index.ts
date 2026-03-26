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
