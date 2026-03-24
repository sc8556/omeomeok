import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { RootStackNavigationProp } from "@/navigation/types";
import { colors, spacing, typography, borderRadius } from "@/theme";
import { MOODS, FOOD_TYPES, FOOD_TYPE_LABELS, BUDGET_OPTIONS, DISTANCE_OPTIONS } from "@/constants";
import { recommendationsApi } from "@/services/api";
import { useSessionId } from "@/hooks/useSessionId";
import { useLocation, type LocationStatus } from "@/hooks/useLocation";

export default function HomeScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const sessionId = useSessionId();
  const { location, address, addressLoading, isDefaultLocation, status: locationStatus, requestPermission } = useLocation();

  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<number | null>(null);
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
  const [selectedDistance, setSelectedDistance] = useState<number>(5);
  const [loading, setLoading] = useState(false);

  const toggleFoodType = (type: string) => {
    setSelectedFoodTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleRecommend = async () => {
    setLoading(true);
    try {
      const response = await recommendationsApi.create({
        session_id: sessionId,
        mood: selectedMood ?? undefined,
        budget: selectedBudget ?? undefined,
        food_types: selectedFoodTypes,
        distance_km: selectedDistance,
        location_lat: location ? String(location.latitude) : undefined,
        location_lng: location ? String(location.longitude) : undefined,
      });
      navigation.navigate("RecommendationResults", { response });
    } catch (e: any) {
      const msg = e?.message || e?.toString() || "알 수 없는 오류";
      Alert.alert("오류", `추천 실패: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.appName}>🍴 오늘 뭐 먹지</Text>
          <Text style={styles.heading}>어떤 분위기예요?</Text>
          <LocationCard
            status={locationStatus}
            address={address}
            addressLoading={addressLoading}
            isDefaultLocation={isDefaultLocation}
            onRetry={requestPermission}
          />
        </View>

        <Section title="분위기">
          <View style={styles.chipRow}>
            {MOODS.map((m) => (
              <Chip
                key={m.id}
                label={`${m.emoji} ${m.label}`}
                selected={selectedMood === m.id}
                onPress={() => setSelectedMood(selectedMood === m.id ? null : m.id)}
              />
            ))}
          </View>
        </Section>

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
          {locationStatus === "denied" && (
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
  accessory,
  children,
}: {
  title: string;
  accessory?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {accessory}
      </View>
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
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.locationCard, styles.locationCardSuccess]}>
      <Ionicons name="location" size={14} color={colors.primaryDark} />
      <Text style={styles.locationCardTextSuccess} numberOfLines={1}>
        {address ?? "위치 확인됨"}
      </Text>
    </View>
  );
}


// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },

  header: { marginBottom: spacing.lg },

  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  locationCardNeutral: { backgroundColor: colors.border },
  locationCardSuccess: { backgroundColor: "#DBEAFE" },
  locationCardDefault: { backgroundColor: "#FEF9C3" },
  locationCardTextNeutral: { fontSize: typography.fontSizes.xs, color: colors.text.secondary },
  locationCardTextSuccess: { flex: 1, fontSize: typography.fontSizes.xs, color: colors.primaryDark, fontWeight: typography.fontWeights.medium },
  locationCardTextDefault: { flex: 1, fontSize: typography.fontSizes.xs, color: "#92400E", fontWeight: typography.fontWeights.medium },

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
  },

  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
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
