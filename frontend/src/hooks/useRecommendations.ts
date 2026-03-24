import { useState } from "react";
import { recommendationsApi } from "@/services/api";
import type { RecommendationRequest, RecommendationResponse } from "@/types";

interface UseRecommendationsReturn {
  data: RecommendationResponse | null;
  loading: boolean;
  error: string | null;
  fetch: (request: RecommendationRequest) => Promise<RecommendationResponse | null>;
}

export function useRecommendations(): UseRecommendationsReturn {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = async (request: RecommendationRequest) => {
    setLoading(true);
    setError(null);
    try {
      const result = await recommendationsApi.create(request);
      setData(result);
      return result;
    } catch (e) {
      setError("Failed to fetch recommendations.");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetch };
}
