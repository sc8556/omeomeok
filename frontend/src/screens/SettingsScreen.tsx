import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { colors, spacing, typography, borderRadius } from "@/theme";
import { useSessionId } from "@/hooks/useSessionId";

export default function SettingsScreen() {
  const sessionId = useSessionId();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>설정 ⚙️</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>세션</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>세션 ID</Text>
          <Text style={styles.rowValue} numberOfLines={1}>{sessionId}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>앱 정보</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>버전</Text>
          <Text style={styles.rowValue}>1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: {
    fontSize: typography.fontSizes.xxl,
    fontWeight: typography.fontWeights.bold,
    color: colors.text.primary,
    padding: spacing.md,
  },
  section: { marginBottom: spacing.md, paddingHorizontal: spacing.md },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  row: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: typography.fontSizes.md,
    color: colors.text.primary,
  },
  rowValue: {
    fontSize: typography.fontSizes.sm,
    color: colors.text.secondary,
    maxWidth: "55%",
  },
});
