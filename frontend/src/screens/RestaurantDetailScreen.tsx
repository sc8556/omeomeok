import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { RootStackParamList, RootStackNavigationProp } from "@/navigation/types";
import { colors, spacing, typography, borderRadius } from "@/theme";
import { CATEGORY_META, DEFAULT_CATEGORY_META, FOOD_TYPE_LABELS } from "@/constants";
import { restaurantsApi } from "@/services/api";
import type { Restaurant } from "@/types";

type RouteType = RouteProp<RootStackParamList, "RestaurantDetail">;

export default function RestaurantDetailScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RouteType>();
  const { restaurantId } = route.params;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    restaurantsApi
      .getById(restaurantId)
      .then(setRestaurant)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurantId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>식당 정보를 찾을 수 없습니다.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← 뒤로</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const meta = CATEGORY_META[restaurant.category] ?? DEFAULT_CATEGORY_META;
  const priceLabels = ["", "저렴", "보통", "고급"];
  const categoryLabel = FOOD_TYPE_LABELS[restaurant.category] ?? restaurant.category;

  const openKakaoPlace = () => {
    if (!restaurant.place_url) return;
    Linking.openURL(restaurant.place_url).catch(() =>
      Alert.alert("오류", "카카오맵을 열 수 없습니다.")
    );
  };

  const openMap = () => {
    let url: string;
    if (restaurant.latitude && restaurant.longitude) {
      url = `https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`;
    } else if (restaurant.address) {
      const query = encodeURIComponent(`${restaurant.name} ${restaurant.address}`);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    } else {
      const query = encodeURIComponent(restaurant.name);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }
    Linking.openURL(url).catch(() =>
      Alert.alert("오류", "지도를 열 수 없습니다.")
    );
  };

  const callPhone = () => {
    if (!restaurant.phone) return;
    const cleaned = restaurant.phone.replace(/\s/g, "");
    Linking.openURL(`tel:${cleaned}`).catch(() =>
      Alert.alert("오류", "전화를 걸 수 없습니다.")
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* 뒤로 가기 */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>

        {/* 히어로 영역 */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroEmoji}>{meta.emoji}</Text>
          </View>
          <Text style={styles.name}>{restaurant.name}</Text>

          {/* 카테고리 + 가격 배지 */}
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.badgeText, { color: meta.text }]}>
                {categoryLabel}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: "#F0FDFA" }]}>
              <Text style={[styles.badgeText, { color: "#0F766E" }]}>
                {["", "₩", "₩₩", "₩₩₩"][restaurant.price_range] ?? "₩₩"}
              </Text>
            </View>
          </View>
        </View>

        {/* 평점 / 가격대 스탯 */}
        <View style={styles.statsRow}>
          <Stat
            icon="star"
            iconColor="#F59E0B"
            label="평점"
            value={restaurant.rating > 0 ? restaurant.rating.toFixed(1) : "—"}
          />
          <View style={styles.statDivider} />
          <Stat
            icon="cash-outline"
            iconColor={colors.secondary}
            label="가격대"
            value={priceLabels[restaurant.price_range] || "—"}
          />
        </View>

        {/* 주소 — 탭하면 지도 */}
        {restaurant.address ? (
          <TouchableOpacity style={styles.infoRow} onPress={openMap}>
            <View style={[styles.infoIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="location-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.infoText}>{restaurant.address}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} />
          </TouchableOpacity>
        ) : null}

        {/* 전화번호 — 탭하면 전화 */}
        {restaurant.phone ? (
          <TouchableOpacity style={styles.infoRow} onPress={callPhone}>
            <View style={[styles.infoIconBox, { backgroundColor: "#F0FDF4" }]}>
              <Ionicons name="call-outline" size={18} color="#16A34A" />
            </View>
            <Text style={styles.infoText}>{restaurant.phone}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} />
          </TouchableOpacity>
        ) : null}

        {/* 설명 */}
        {restaurant.description ? (
          <View style={styles.descriptionBox}>
            <Text style={styles.descriptionLabel}>소개</Text>
            <Text style={styles.descriptionText}>{restaurant.description}</Text>
          </View>
        ) : null}

        {/* 액션 버튼 */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={openMap}>
            <Ionicons name="map-outline" size={20} color={colors.text.inverse} />
            <Text style={styles.actionBtnText}>지도에서 보기</Text>
          </TouchableOpacity>

          {restaurant.phone ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={callPhone}
            >
              <Ionicons name="call-outline" size={20} color={colors.primary} />
              <Text style={[styles.actionBtnText, styles.actionBtnOutlineText]}>
                전화 걸기
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {restaurant.place_url ? (
          <TouchableOpacity style={styles.kakaoBtn} onPress={openKakaoPlace}>
            <Ionicons name="restaurant-outline" size={18} color="#3A1D96" />
            <Text style={styles.kakaoBtnText}>카카오맵에서 메뉴 보기</Text>
            <Ionicons name="open-outline" size={14} color="#3A1D96" />
          </TouchableOpacity>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Stat({
  icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={20} color={iconColor} style={{ marginBottom: 4 }} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing.md, paddingBottom: spacing.xxl },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  backText: {
    fontSize: typography.fontSizes.md,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
    marginLeft: 2,
  },

  hero: { alignItems: "center", marginBottom: spacing.lg },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  heroEmoji: { fontSize: 40 },
  name: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  badgeRow: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
  },

  statsRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  stat: { flex: 1, alignItems: "center" },
  statDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  statValue: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
  },

  descriptionBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  descriptionLabel: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  descriptionText: {
    fontSize: typography.fontSizes.md,
    color: colors.text.secondary,
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
  },

  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
  },
  actionBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  actionBtnText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  actionBtnOutlineText: {
    color: colors.primary,
  },

  kakaoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: "#EDE9FE",
  },
  kakaoBtnText: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: "#3A1D96",
  },

  errorText: {
    fontSize: typography.fontSizes.lg,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
});
