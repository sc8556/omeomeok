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
import { restaurantsApi, ratingsApi } from "@/services/api";
import { useSessionId } from "@/hooks/useSessionId";
import type { Restaurant, UserRatingRead } from "@/types";

type RouteType = RouteProp<RootStackParamList, "RestaurantDetail">;

export default function RestaurantDetailScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RouteType>();
  const { restaurantId } = route.params;
  const sessionId = useSessionId();

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState<UserRatingRead | null>(null);
  const [pendingRating, setPendingRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      restaurantsApi.getById(restaurantId),
      ratingsApi.getUserRating(sessionId, restaurantId),
    ])
      .then(([r, ur]) => {
        setRestaurant(r);
        setMyRating(ur);
        setPendingRating(ur?.overall ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [restaurantId, sessionId]);

  const handleSubmitRating = async () => {
    if (!pendingRating) return;
    setSubmitting(true);
    try {
      const saved = await ratingsApi.submit({
        session_id: sessionId,
        restaurant_id: restaurantId,
        overall: pendingRating,
      });
      setMyRating(saved);
      const updated = await restaurantsApi.getById(restaurantId);
      setRestaurant(updated);
      Alert.alert("저장됨", "평점이 저장되었습니다.");
    } catch {
      Alert.alert("오류", "평점 저장에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRating = () => {
    Alert.alert("평점 삭제", "내 평점을 삭제하시겠습니까?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await ratingsApi.deleteRating(sessionId, restaurantId);
            setMyRating(null);
            setPendingRating(null);
            const updated = await restaurantsApi.getById(restaurantId);
            setRestaurant(updated);
          } catch {
            Alert.alert("오류", "평점 삭제에 실패했습니다.");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  };

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
  const categoryLabel = FOOD_TYPE_LABELS[restaurant.category] ?? restaurant.category;
  const hasUserRatings = (restaurant.user_rating_count ?? 0) > 0;

  const openKakaoPlace = () => {
    if (!restaurant.place_url) return;
    Linking.openURL(restaurant.place_url).catch(() =>
      Alert.alert("오류", "카카오맵을 열 수 없습니다.")
    );
  };

  const openNaverPlace = () => {
    if (!restaurant.naver_place_url) return;
    Linking.openURL(restaurant.naver_place_url).catch(() =>
      Alert.alert("오류", "네이버 지도를 열 수 없습니다.")
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

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: meta.bg }]}>
              <Text style={[styles.badgeText, { color: meta.text }]}>
                {categoryLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* 평점 스탯 */}
        <View style={styles.statsRow}>
          {hasUserRatings ? (
            <>
              <Stat
                icon="heart"
                iconColor="#EF4444"
                label={`앱 평점 (${restaurant.user_rating_count}명)`}
                value={restaurant.user_rating_avg!.toFixed(1)}
              />
              {restaurant.rating > 0 && (
                <>
                  <View style={styles.statDivider} />
                  <Stat
                    icon="star"
                    iconColor="#F59E0B"
                    label="카카오 평점"
                    value={restaurant.rating.toFixed(1)}
                  />
                </>
              )}
            </>
          ) : restaurant.rating > 0 ? (
            <Stat
              icon="star"
              iconColor="#F59E0B"
              label="평점"
              value={restaurant.rating.toFixed(1)}
            />
          ) : null}
          {(restaurant.naver_review_count ?? 0) > 0 && (
            <>
              {(hasUserRatings || restaurant.rating > 0) && (
                <View style={styles.statDivider} />
              )}
              <Stat
                icon="chatbubble-ellipses"
                iconColor="#03C75A"
                label="네이버 리뷰"
                value={`${restaurant.naver_review_count}`}
              />
            </>
          )}
        </View>

        {/* 내 평점 입력 */}
        <View style={styles.ratingBox}>
          <View style={styles.ratingBoxHeader}>
            <Text style={styles.ratingBoxTitle}>
              {myRating ? "내 평점" : "이 식당은 어땠나요?"}
            </Text>
            {myRating && (
              <TouchableOpacity
                onPress={handleDeleteRating}
                disabled={deleting}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={colors.text.disabled} />
                ) : (
                  <Ionicons name="trash-outline" size={18} color={colors.text.disabled} />
                )}
              </TouchableOpacity>
            )}
          </View>
          <StarPicker value={pendingRating} onChange={setPendingRating} />
          {pendingRating !== (myRating?.overall ?? null) && (
            <TouchableOpacity
              style={[styles.ratingSubmitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmitRating}
              disabled={submitting || !pendingRating}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.ratingSubmitText}>평점 저장</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* 주소 */}
        {restaurant.address ? (
          <View style={styles.infoRow}>
            <View style={[styles.infoIconBox, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="location-outline" size={18} color="#2563EB" />
            </View>
            <Text style={styles.infoText}>{restaurant.address}</Text>
          </View>
        ) : null}

        {/* 전화번호 */}
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

        {/* 메뉴 보기 */}
        {restaurant.naver_place_url ? (
          <TouchableOpacity style={styles.menuBtn} onPress={openNaverPlace}>
            <View style={styles.menuBtnLeft}>
              <Ionicons name="receipt-outline" size={20} color="#03C75A" />
              <View>
                <Text style={[styles.menuBtnTitle, { color: "#03C75A" }]}>메뉴 보기</Text>
                <Text style={[styles.menuBtnSub, { color: "#059669" }]}>네이버 지도에서 메뉴·가격 확인</Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={16} color="#03C75A" />
          </TouchableOpacity>
        ) : restaurant.place_url ? (
          <TouchableOpacity style={styles.menuBtn} onPress={openKakaoPlace}>
            <View style={styles.menuBtnLeft}>
              <Ionicons name="receipt-outline" size={20} color="#3A1D96" />
              <View>
                <Text style={styles.menuBtnTitle}>메뉴 보기</Text>
                <Text style={styles.menuBtnSub}>카카오맵에서 메뉴·가격 확인</Text>
              </View>
            </View>
            <Ionicons name="open-outline" size={16} color="#3A1D96" />
          </TouchableOpacity>
        ) : null}

        {/* 액션 버튼 */}
        {restaurant.phone ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={callPhone}>
              <Ionicons name="call-outline" size={20} color={colors.text.inverse} />
              <Text style={styles.actionBtnText}>전화 걸기</Text>
            </TouchableOpacity>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── StarPicker ──────────────────────────────────────────────────────────────

function StarPicker({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity key={star} onPress={() => onChange(star)} activeOpacity={0.7}>
          <Ionicons
            name={value !== null && star <= value ? "star" : "star-outline"}
            size={36}
            color={value !== null && star <= value ? "#F59E0B" : colors.text.disabled}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Stat ────────────────────────────────────────────────────────────────────

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
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    marginTop: 2,
    textAlign: "center",
  },

  // 평점 입력 박스
  ratingBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  ratingBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: spacing.sm,
  },
  ratingBoxTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  starRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  ratingSubmitBtn: {
    marginTop: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    alignItems: "center",
    minWidth: 100,
  },
  ratingSubmitText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
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
  actionBtnText: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },

  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#EDE9FE",
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  menuBtnLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  menuBtnTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: "#3A1D96",
  },
  menuBtnSub: {
    fontSize: typography.fontSizes.xs,
    color: "#6D28D9",
    marginTop: 2,
  },

  errorText: {
    fontSize: typography.fontSizes.lg,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
});
