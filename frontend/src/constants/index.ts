export const API_ROOT_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://192.168.35.124:8000";
export const API_BASE_URL = `${API_ROOT_URL}/api/v1`;

export const MOODS = [
  { id: "romantic", label: "로맨틱", emoji: "💕" },
  { id: "casual", label: "가볍게", emoji: "😊" },
  { id: "special", label: "특별한 날", emoji: "🎉" },
  { id: "adventurous", label: "새로운 도전", emoji: "🌍" },
  { id: "cozy", label: "아늑하게", emoji: "🕯️" },
];

export const FOOD_TYPES = [
  "Korean",
  "Japanese",
  "Italian",
  "Chinese",
  "Mexican",
  "American",
  "French",
  "Indian",
  "Thai",
  "Mediterranean",
];

export const FOOD_TYPE_LABELS: Record<string, string> = {
  Korean: "한식",
  Japanese: "일식",
  Italian: "이탈리안",
  Chinese: "중식",
  Mexican: "멕시칸",
  American: "양식",
  French: "프렌치",
  Indian: "인도",
  Thai: "태국",
  Mediterranean: "지중해",
};

export const BUDGET_OPTIONS = [
  { label: "1만 5천원 이하", value: 15000 },
  { label: "1만 5천 – 3만원", value: 30000 },
  { label: "3만 – 6만원", value: 60000 },
  { label: "6만원 이상", value: 100000 },
];

export const DISTANCE_OPTIONS = [
  { label: "1km 이내", value: 1 },
  { label: "3km 이내", value: 3 },
  { label: "5km 이내", value: 5 },
  { label: "10km 이내", value: 10 },
];

export const CATEGORY_META: Record<string, { bg: string; text: string; emoji: string }> = {
  Korean:        { bg: "#FFF0F0", text: "#E05555", emoji: "🥩" },
  Japanese:      { bg: "#FFF7ED", text: "#C2410C", emoji: "🍱" },
  Italian:       { bg: "#F0FDF4", text: "#16A34A", emoji: "🍝" },
  French:        { bg: "#EFF6FF", text: "#2563EB", emoji: "🥐" },
  Chinese:       { bg: "#FFF7ED", text: "#D97706", emoji: "🥟" },
  Thai:          { bg: "#ECFDF5", text: "#059669", emoji: "🍜" },
  Indian:        { bg: "#FDF4FF", text: "#9333EA", emoji: "🍛" },
  American:      { bg: "#F0F9FF", text: "#0284C7", emoji: "🍔" },
  Mexican:       { bg: "#FFFBEB", text: "#B45309", emoji: "🌮" },
  Mediterranean: { bg: "#F0FDFA", text: "#0F766E", emoji: "🫒" },
};

export const DEFAULT_CATEGORY_META = { bg: "#F3F4F6", text: "#6B7280", emoji: "🍽️" };
