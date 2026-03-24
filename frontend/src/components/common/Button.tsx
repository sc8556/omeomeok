import React from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  type TouchableOpacityProps,
} from "react-native";
import { colors, typography, borderRadius, spacing } from "@/theme";

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  variant?: "primary" | "outline";
  loading?: boolean;
}

export function Button({ label, variant = "primary", loading, style, ...rest }: ButtonProps) {
  const isPrimary = variant === "primary";
  return (
    <TouchableOpacity
      style={[styles.base, isPrimary ? styles.primary : styles.outline, style]}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.text.inverse : colors.primary} />
      ) : (
        <Text style={[styles.label, !isPrimary && styles.labelOutline]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.primary },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  label: {
    color: colors.text.inverse,
    fontSize: typography.fontSizes.md,
    fontWeight: typography.fontWeights.semibold,
  },
  labelOutline: { color: colors.primary },
});
