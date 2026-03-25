import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { RootStackNavigationProp } from "@/navigation/types";
import { colors, spacing, typography, borderRadius } from "@/theme";
import { FOOD_TYPES, FOOD_TYPE_LABELS, BUDGET_OPTIONS, DISTANCE_OPTIONS } from "@/constants";
import { recommendationsApi, geocodeApi } from "@/services/api";
import { useSessionId } from "@/hooks/useSessionId";
import { useLocation, type LocationStatus } from "@/hooks/useLocation";
import type { LocationSuggestion } from "@/types";

export default function HomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const sessionId = useSessionId();
  const { location, address, addressLoading, isDefaultLocation, status: locationStatus, requestPermission } = useLocation();

  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  // 위치 검색
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [customLocation, setCustomLocation] = useState<LocationSuggestion | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([]);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await geocodeApi.search(searchQuery.trim());
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }, [searchQuery]);

  const toggleFoodType = (type: string) => {
    setSelectedFoodTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const selectSuggestion = (s: LocationSuggestion) => {
    setCustomLocation(s);
    setShowSearch(false);
    setSearchQuery("");
    setSuggestions([]);
  };

  const clearCustomLocation = () => {
    setCustomLocation(null);
  };

  const activeLocation = customLocation
    ? { latitude: customLocation.lat, longitude: customLocation.lng }
    : location;
  const activeIsDefault = customLocation ? false : isDefaultLocation;

  const handleRecommend = async () => {
    setLoading(true);
    try {
      const response = await recommendationsApi.create({
        session_id: sessionId,
        budget: selectedBudget ?? undefined,
        food_types: selectedFoodTypes,
        distance_km: selectedDistance,
        location_lat: activeLocation ? String(activeLocation.latitude) : undefined,
        location_lng: activeLocation ? String(activeLocation.longitude) : undefined,
      });
      navigation.navigate("RecommendationResults", {
        response,
        distanceKm: selectedDistance,
        isDefaultLocation: activeIsDefault,
      });
    } catch (e: any) {
      const msg = e?.message || e?.toString() || "알 수 없는 오류";
      Alert.alert("오류", `추천 실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.appName}>🍴 오늘 뭐 먹지</Text>
          <Text style={styles.heading}>어디서 먹을까요?</Text>

          {/* 현재 위치 카드 */}
          {!customLocation && (
            <LocationCard
              status={locationStatus}
              address={address}
              addressLoading={addressLoading}
              isDefaultLocation={isDefaultLocation}
              onRetry={requestPermission}
            />
          )}

          {/* 커스텀 위치 선택됨 */}
          {customLocation && (
            <View style={styles.customLocationCard}>
              <Ionicons name="location" size={14} color={colors.primaryDark} />
              <Text style={styles.customLocationText} numberOfLines={1}>
                {customLocation.name}
              </Text>
              <TouchableOpacity onPress={clearCustomLocation} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* 위치 검색 토글 버튼 */}
          {!showSearch && (
            <TouchableOpacity
              style={styles.searchToggleBtn}
              onPress={() => setShowSearch(true)}
            >
              <Ionicons name="search-outline" size={13} color={colors.primary} />
              <Text style={styles.searchToggleText}>
                {customLocation ? "다른 위치로 변경" : "다른 위치로 검색"}
              </Text>
            </TouchableOpacity>
          )}

          {/* 위치 검색 입력창 */}
          {showSearch && (
            <View style={styles.searchBox}>
              <View style={styles.searchInputRow}>
                <Ionicons name="search-outline" size={16} color={colors.text.disabled} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="지역명 입력 (예: 홍대, 강남역)"
                  placeholderTextColor={colors.text.disabled}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  returnKeyType="search"
                />
                {searchLoading && <ActivityIndicator size="small" color={colors.primary} />}
                <TouchableOpacity
                  onPress={() => {
                    setShowSearch(false);
                    setSearchQuery("");
                    setSuggestions([]);
                  }}
                >
                  <Ionicons name="close" size={18} color={colors.text.secondary} />
                </TouchableOpacity>
              </View>

              {suggestions.length > 0 && (
                <View style={styles.suggestionList}>
                  {suggestions.map((s, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.suggestionItem,
                        i < suggestions.length - 1 && styles.suggestionItemBorder,
                      ]}
                      onPress={() => selectSuggestion(s)}
                    >
                      <Ionicons name="location-outline" size={14} color={colors.primary} />
                      <View style={styles.suggestionText}>
                        <Text style={styles.suggestionName}>{s.name}</Text>
                        {s.address ? (
                          <Text style={styles.suggestionAddress} numberOfLines={1}>
                            {s.address}
                          </Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        <Section title="음식 종류">
          <View style={styles.chipRow}>
            {FOOD_TYPES.map((f) => (
              <Chip
                key={f}
                label={FOOD_TYPE_LABELS[f] ?? f}
                selected={selectedFoodTypes.includes(f)}
                onPress={() => toggleFoodType(f)}
              />
            ))}
          </View>
        </Section>

        <Section title="예산 (1인 기준)">
          <View style={styles.chipRow}>
            {BUDGET_OPTIONS.map((b) => (
              <Chip
                key={b.value}
                label={b.label}
                selected={selectedBudget === b.value}
                onPress={() =>
                  setSelectedBudget(selectedBudget === b.value ? null : b.value)
                }
              />
            ))}
          </View>
        </Section>

        <Section title="거리">
          <View style={styles.chipRow}>
            {DISTANCE_OPTIONS.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                selected={selectedDistance === d.value}
                onPress={() => setSelectedDistance(d.value)}
              />
            ))}
          </View>
          {locationStatus === "denied" && !customLocation && (
            <Text style={styles.locationNote}>
              위치 권한이 거부되어 거리 필터가 비활성화됩니다.
            </Text>
          )}
        </Section>

        <TouchableOpacity
          style={[styles.cta, loading && styles.ctaDisabled]}
          onPress={handleRecommend}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.text.inverse} />
          ) : (
            <Text style={styles.ctaText}>맛집 찾기 🍴</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function LocationCard({
  status,
  address,
  addressLoading,
  isDefaultLocation,
  onRetry,
}: {
  status: LocationStatus;
  address: string | null;
  addressLoading: boolean;
  isDefaultLocation: boolean;
  onRetry: () => void;
}) {
  if (status === "idle") return null;

  if (status === "requesting" || addressLoading) {
    return (
      <View style={[styles.locationCard, styles.locationCardNeutral]}>
        <ActivityIndicator size="small" color={colors.text.secondary} />
        <Text style={styles.locationCardTextNeutral}>위치를 확인하는 중…</Text>
      </View>
    );
  }

  if (isDefaultLocation) {
    return (
      <TouchableOpacity style={[styles.locationCard, styles.locationCardDefault]} onPress={onRetry}>
        <Ionicons name="location-outline" size={14} color={colors.warning} />
        <Text style={styles.locationCardTextDefault} numberOfLines={1}>
          {address ?? "서울 중구 태평로1가 (기본 위치)"}
        </Text>
        <Ionicons name="refresh-outline" size={14} color="#92400E" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={[styles.locationCard, styles.locationCardSuccess]} onPress={onRetry}>
      <Ionicons name="location" size={14} color={colors.primaryDark} />
      <Text style={styles.locationCardTextSuccess} numberOfLines={1}>
        {address ?? "위치 확인됨"}
      </Text>
      <Ionicons name="refresh-outline" size={14} color={colors.primaryDark} />
    </TouchableOpacity>
  );
}


// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },

  header: { marginBottom: spacing.lg },

  appName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  heading: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },

  // 현재 위치 카드
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  locationCardNeutral: { backgroundColor: colors.border },
  locationCardSuccess: { backgroundColor: "#DBEAFE" },
  locationCardDefault: { backgroundColor: "#FEF9C3" },
  locationCardTextNeutral: { fontSize: typography.fontSizes.xs, color: colors.text.secondary },
  locationCardTextSuccess: { flex: 1, fontSize: typography.fontSizes.xs, color: colors.primaryDark, fontWeight: typography.fontWeights.medium },
  locationCardTextDefault: { flex: 1, fontSize: typography.fontSizes.xs, color: "#92400E", fontWeight: typography.fontWeights.medium },

  // 커스텀 위치 카드
  customLocationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    backgroundColor: "#DBEAFE",
  },
  customLocationText: {
    flex: 1,
    fontSize: typography.fontSizes.xs,
    color: colors.primaryDark,
    fontWeight: typography.fontWeights.medium,
  },

  // 검색 토글 버튼
  searchToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
    alignSelf: "flex-start",
    paddingVertical: 4,
  },
  searchToggleText: {
    fontSize: typography.fontSizes.xs,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },

  // 검색 입력창
  searchBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    overflow: "hidden",
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
    paddingVertical: 0,
  },

  // 자동완성 목록
  suggestionList: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  suggestionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  suggestionText: { flex: 1 },
  suggestionName: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  suggestionAddress: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // 섹션
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
  chipTextSelected: { color: colors.text.inverse },

  locationNote: {
    marginTop: spacing.sm,
    fontSize: typography.fontSizes.xs,
    color: colors.text.disabled,
    fontStyle: "italic",
  },

  cta: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    alignItems: "center",
    marginTop: spacing.md,
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
  },
});
