import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { RootStackParamList, RootStackNavigationProp } from "@/navigation/types";
import { colors, spacing, typography, borderRadius } from "@/theme";
import { CATEGORY_META, DEFAULT_CATEGORY_META, FOOD_TYPE_LABELS } from "@/constants";
import { extractDistance, scoreColor } from "@/utils";
import type { RecommendationItem } from "@/types";

type RouteType = RouteProp<RootStackParamList, "RecommendationResults">;

export default function RecommendationResultsScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const route = useRoute<RouteType>();
  const { response, distanceKm, isDefaultLocation } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={colors.primary} />
          <Text style={styles.backText}>뒤로</Text>
        </TouchableOpacity>
        <Text style={styles.heading}>
          {response.results.length > 0
            ? `추천 장소 ${response.results.length}곳`
            : "추천 결과 없음"}
        </Text>
        <Text style={styles.subheading}>카드를 탭하면 상세 정보를 볼 수 있어요</Text>
      </View>

      <FlatList
        data={response.results}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => (
          <RestaurantCard
            item={item}
            rank={index + 1}
            onPress={() =>
              navigation.navigate("RestaurantDetail", {
                restaurantId: item.restaurant.id,
              })
            }
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState distanceKm={distanceKm} isDefaultLocation={isDefaultLocation} />
        }
      />
    </SafeAreaView>
  );
}

// ─── RestaurantCard ──────────────────────────────────────────────────────────

function RestaurantCard({
  item,
  rank,
  onPress,
}: {
  item: RecommendationItem;
  rank: number;
  onPress: () => void;
}) {
  const { restaurant, score, reason } = item;
  const meta = CATEGORY_META[restaurant.category] ?? DEFAULT_CATEGORY_META;
  const distText = reason ? extractDistance(reason) : null;
  const reasonWithoutDist = reason
    ? reason.replace(/,?\s*\d+(?:\.\d+)?(?:km|m)\s*거리/g, "").trim()
    : null;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      {/* Top row: rank + name + score */}
      <View style={styles.cardTop}>
        <RankBadge rank={rank} />
        <View style={styles.nameBlock}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant.name}
          </Text>
        </View>
        <ScoreBadge score={score} />
      </View>

      {/* Tags row: category + price + distance */}
      <View style={styles.tagsRow}>
        <CategoryBadge category={restaurant.category} meta={meta} />
        <PriceBadge range={restaurant.price_range} />
        {distText && <DistanceBadge text={distText} />}
      </View>

      {/* Rating row */}
      <View style={styles.ratingRow}>
        <Ionicons name="star" size={13} color="#F59E0B" />
        <Text style={styles.ratingText}>{restaurant.rating.toFixed(1)}</Text>
        {restaurant.address ? (
          <>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.address} numberOfLines={1}>
              {restaurant.address}
            </Text>
          </>
        ) : null}
      </View>

      {/* Reason */}
      {reasonWithoutDist ? (
        <Text style={styles.reason} numberOfLines={2}>
          {reasonWithoutDist}
        </Text>
      ) : null}

      {/* Chevron hint */}
      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.text.disabled}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

// ─── Small atoms ─────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const isTop = rank === 1;
  return (
    <View style={[styles.rankBadge, isTop && styles.rankBadgeTop]}>
      <Text style={[styles.rankText, isTop && styles.rankTextTop]}>
        #{rank}
      </Text>
    </View>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <View style={[styles.scoreBadge, { borderColor: color }]}>
      <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
      <Text style={styles.scoreLabel}>점</Text>
    </View>
  );
}

function CategoryBadge({
  category,
  meta,
}: {
  category: string;
  meta: { bg: string; text: string; emoji: string };
}) {
  return (
    <View style={[styles.tag, { backgroundColor: meta.bg }]}>
      <Text style={[styles.tagText, { color: meta.text }]}>
        {meta.emoji} {FOOD_TYPE_LABELS[category] ?? category}
      </Text>
    </View>
  );
}

function PriceBadge({ range }: { range: number }) {
  const labels = ["", "₩", "₩₩", "₩₩₩"];
  const label = labels[range] ?? "₩₩";
  return (
    <View style={[styles.tag, { backgroundColor: "#F0FDFA" }]}>
      <Text style={[styles.tagText, { color: "#0F766E" }]}>{label}</Text>
    </View>
  );
}

function DistanceBadge({ text }: { text: string }) {
  return (
    <View style={[styles.tag, styles.tagDist]}>
      <Ionicons name="location-outline" size={11} color={colors.primary} />
      <Text style={[styles.tagText, { color: colors.primary }]}>{text}</Text>
    </View>
  );
}

function EmptyState({
  distanceKm,
  isDefaultLocation,
}: {
  distanceKm: number;
  isDefaultLocation: boolean;
}) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📍</Text>
      <Text style={styles.emptyTitle}>근처에 등록된 맛집이 없어요</Text>
      <Text style={styles.emptyBody}>
        {isDefaultLocation
          ? "현재 기본 위치(서울 시청)를 사용 중이에요.\nGPS 권한을 허용하거나 거리를 늘려보세요."
          : `현재 위치 기준 ${distanceKm}km 내에\n등록된 식당이 없어요.\n거리를 늘리거나 필터를 줄여보세요.`}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  backText: {
    fontSize: typography.fontSizes.md,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
    marginLeft: 2,
  },
  heading: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  subheading: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },

  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },

  // ── Card ──
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  nameBlock: { flex: 1 },
  restaurantName: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },

  // ── Rank ──
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.full,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeTop: { backgroundColor: "#FEF3C7" },
  rankText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.secondary,
  },
  rankTextTop: { color: "#92400E" },

  // ── Score ──
  scoreBadge: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scoreNumber: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
  },
  scoreLabel: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    marginBottom: 1,
  },

  // ── Tags ──
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  tagDist: { backgroundColor: "#DBEAFE" },
  tagText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },

  // ── Rating / address ──
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: spacing.xs,
  },
  ratingText: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
  },
  dot: {
    color: colors.text.disabled,
    fontSize: typography.fontSizes.sm,
  },
  address: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    flex: 1,
  },

  // ── Reason ──
  reason: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    lineHeight: typography.fontSizes.sm * typography.lineHeights.relaxed,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },

  // ── Chevron ──
  chevron: {
    position: "absolute",
    right: spacing.md,
    bottom: spacing.md,
  },

  // ── Empty ──
  emptyContainer: {
    alignItems: "center",
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyBody: {
    fontSize: typography.fontSizes.md,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: typography.fontSizes.md * typography.lineHeights.relaxed,
  },
});
