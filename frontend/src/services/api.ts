import axios from "axios";
import { API_BASE_URL, API_ROOT_URL } from "@/constants";
import type {
  RecommendationRequest,
  RecommendationResponse,
  Restaurant,
  HistoryResponse,
  Preference,
  LocationSuggestion,
} from "@/types";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

export const recommendationsApi = {
  create: (request: RecommendationRequest): Promise<RecommendationResponse> =>
    client.post("/recommendations", request).then((r) => r.data),
};

export const restaurantsApi = {
  list: (limit = 2000): Promise<Restaurant[]> =>
    client.get("/restaurants", { params: { limit } }).then((r) => r.data),
  getById: (id: number): Promise<Restaurant> =>
    client.get(`/restaurants/${id}`).then((r) => r.data),
};

export const historyApi = {
  getBySession: (sessionId: string): Promise<HistoryResponse> =>
    client.get(`/history/${sessionId}`).then((r) => r.data),
};

export const preferencesApi = {
  save: (data: Omit<Preference, "id">): Promise<Preference> =>
    client.post("/preferences", data).then((r) => r.data),
  getBySession: (sessionId: string): Promise<Preference> =>
    client.get(`/preferences/${sessionId}`).then((r) => r.data),
};

export const geocodeApi = {
  reverse: (lat: number, lng: number): Promise<{ address: string }> =>
    client.get("/geocode/reverse", { params: { lat, lng } }).then((r) => r.data),
  search: (query: string): Promise<LocationSuggestion[]> =>
    client.get("/geocode/search", { params: { query } }).then((r) => r.data),
};

export const healthApi = {
  check: (): Promise<{ status: string; version: string }> =>
    axios.get(`${API_ROOT_URL}/health`).then((r) => r.data),
};

export default client;
