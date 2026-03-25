import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RootStackNavigationProp } from "@/navigation/types";
import { colors, spacing, typography, borderRadius } from "@/theme";
import { CATEGORY_META, DEFAULT_CATEGORY_META, FOOD_TYPE_LABELS } from "@/constants";
import { historyApi } from "@/services/api";
import { useSessionId } from "@/hooks/useSessionId";
import { groupItemsByDate, scoreColor } from "@/utils";
import type { RecommendationItem } from "@/types";

type Section = { title: string; date: string; data: RecommendationItem[] };

export default function HistoryScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();
  const sessionId = useSessionId();

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadHistory = useCallback(
    async (isRefresh = false) => {
      if (!sessionId) return;
      if (isRefresh) setRefreshing(true);
      try {
        const res = await historyApi.getBySession(sessionId);
        setSections(groupItemsByDate(res.items));
      } catch {
        // 에러 시 기존 데이터 유지 (서버 cold start 등으로 실패해도 기록 유지)
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [sessionId]
  );

  // 탭 포커스 시마다 최신 데이터 로드
  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>추천 기록</Text>
        {sections.length > 0 && (
          <Text style={styles.subheading}>
            총 {sections.reduce((acc, s) => acc + s.data.length, 0)}개
          </Text>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadHistory(true)}
            tintColor={colors.primary}
          />
        }
        renderSectionHeader={({ section }) => (
          <DateHeader title={section.title} count={section.data.length} />
        )}
        renderItem={({ item }) => (
          <HistoryCard
            item={item}
            onPress={() =>
              navigation.navigate("RestaurantDetail", {
                restaurantId: item.restaurant.id,
              })
            }
          />
        )}
        ListEmptyComponent={<EmptyState />}
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
      />
    </SafeAreaView>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function DateHeader({ title, count }: { title: string; count: number }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionCount}>{count}곳</Text>
    </View>
  );
}

function HistoryCard({
  item,
  onPress,
}: {
  item: RecommendationItem;
  onPress: () => void;
}) {
  const { restaurant, score, reason } = item;
  const meta = CATEGORY_META[restaurant.category] ?? DEFAULT_CATEGORY_META;
  const categoryLabel = FOOD_TYPE_LABELS[restaurant.category] ?? restaurant.category;
  const time = new Date(item.created_at).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const color = scoreColor(score);

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.75} onPress={onPress}>
      {/* 상단: 카테고리 배지 + 시간 */}
      <View style={styles.cardTop}>
        <View style={[styles.categoryBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.categoryText, { color: meta.text }]}>
            {meta.emoji} {categoryLabel}
          </Text>
        </View>
        <Text style={styles.time}>{time}</Text>
      </View>

      {/* 중단: 식당 이름 + 점수 */}
      <View style={styles.cardMiddle}>
        <Text style={styles.restaurantName} numberOfLines={1}>
          {restaurant.name}
        </Text>
        <View style={[styles.scoreBadge, { borderColor: color }]}>
          <Text style={[styles.scoreText, { color }]}>{score}점</Text>
        </View>
      </View>

      {/* 하단: 평점 + 추천 이유 */}
      <View style={styles.cardBottom}>
        <Ionicons name="star" size={12} color="#F59E0B" />
        <Text style={styles.rating}>{restaurant.rating.toFixed(1)}</Text>
        {reason ? (
          <>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.reason} numberOfLines={1}>
              {reason}
            </Text>
          </>
        ) : null}
      </View>

      <Ionicons
        name="chevron-forward"
        size={16}
        color={colors.text.disabled}
        style={styles.chevron}
      />
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>📋</Text>
      <Text style={styles.emptyTitle}>아직 기록이 없어요</Text>
      <Text style={styles.emptyBody}>추천 탭에서 맛집을 찾아보세요!</Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  heading: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  subheading: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
  },

  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
  },
  sectionCount: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  categoryText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  time: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.disabled,
  },

  cardMiddle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  restaurantName: {
    flex: 1,
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  scoreBadge: {
    borderWidth: 1.5,
    borderRadius: borderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  scoreText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.bold,
  },

  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.primary,
    fontWeight: typography.fontWeights.medium,
  },
  dot: {
    color: colors.text.disabled,
    fontSize: typography.fontSizes.sm,
  },
  reason: {
    flex: 1,
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
  },

  chevron: {
    position: "absolute",
    right: spacing.md,
    top: "50%",
  },

  emptyContainer: {
    alignItems: "center",
    marginTop: spacing.xxl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontSize: typography.fontSizes.md,
    color: colors.text.secondary,
  },
});
