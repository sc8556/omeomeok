import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import type { RootStackNavigationProp } from "@/navigation/types";
import { colors, spacing, typography, borderRadius } from "@/theme";
import { CATEGORY_META, DEFAULT_CATEGORY_META, FOOD_TYPE_LABELS } from "@/constants";
import { restaurantsApi } from "@/services/api";
import type { Restaurant } from "@/types";

const PRICE_LABELS = ["", "₩", "₩₩", "₩₩₩"];

export default function RestaurantListScreen() {
  const navigation = useNavigation<RootStackNavigationProp>();

  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await restaurantsApi.list();
      setRestaurants(data);
    } catch {
      // 에러 시 기존 데이터 유지 (서버 cold start 등으로 실패해도 목록 유지)
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );


  const filtered = query.trim()
    ? restaurants.filter(
        (r) =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          (FOOD_TYPE_LABELS[r.category] ?? r.category)
            .toLowerCase()
            .includes(query.toLowerCase())
      )
    : restaurants;

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
        <Text style={styles.heading}>식당 목록</Text>
        <Text style={styles.subheading}>전체 {restaurants.length}곳</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={colors.text.disabled} />
        <TextInput
          style={styles.searchInput}
          placeholder="식당 이름 또는 종류로 검색"
          placeholderTextColor={colors.text.disabled}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery("")}>
            <Ionicons name="close-circle" size={16} color={colors.text.disabled} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => load(true)}
            tintColor={colors.primary}
          />
        }
        renderItem={({ item }) => (
          <RestaurantRow
            item={item}
            onPress={() => navigation.navigate("RestaurantDetail", { restaurantId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🍽️</Text>
            <Text style={styles.emptyTitle}>
              {query ? "검색 결과가 없어요" : "등록된 식당이 없어요"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function RestaurantRow({
  item,
  onPress,
}: {
  item: Restaurant;
  onPress: () => void;
}) {
  const meta = CATEGORY_META[item.category] ?? DEFAULT_CATEGORY_META;
  const categoryLabel = FOOD_TYPE_LABELS[item.category] ?? item.category;
  const priceLabel = PRICE_LABELS[item.price_range] ?? "₩₩";

  return (
    <TouchableOpacity style={styles.row} activeOpacity={0.75} onPress={onPress}>
      <View style={styles.emojiBox}>
        <Text style={styles.emoji}>{meta.emoji}</Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.tagRow}>
          <View style={[styles.tag, { backgroundColor: meta.bg }]}>
            <Text style={[styles.tagText, { color: meta.text }]}>{categoryLabel}</Text>
          </View>
          <Text style={styles.price}>{priceLabel}</Text>
          <Ionicons name="star" size={11} color="#F59E0B" />
          <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
        </View>
        {item.address ? (
          <Text style={styles.address} numberOfLines={1}>
            {item.address}
          </Text>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.text.disabled} />
    </TouchableOpacity>
  );
}

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

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
    paddingVertical: 0,
  },

  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },

  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 24 },

  info: { flex: 1 },
  name: {
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 3,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  tagText: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.semibold,
  },
  price: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.secondary,
    fontWeight: typography.fontWeights.medium,
  },
  rating: {
    fontSize: typography.fontSizes.xs,
    fontWeight: typography.fontWeights.medium,
    color: colors.text.primary,
  },
  address: {
    fontSize: typography.fontSizes.xs,
    color: colors.text.disabled,
  },

  emptyContainer: { alignItems: "center", marginTop: spacing.xxl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: {
    fontSize: typography.fontSizes.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.secondary,
  },
});
