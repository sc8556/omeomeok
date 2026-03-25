import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RecommendationResponse } from "@/types";

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  RecommendationResults: { response: RecommendationResponse; distanceKm: number; isDefaultLocation: boolean };
  RestaurantDetail: { restaurantId: number };
};

export type MainTabParamList = {
  Home: undefined;
  Restaurants: undefined;
  History: undefined;
  Settings: undefined;
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
