import React from "react";
import { TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { SymbolView } from "expo-symbols";
import { useTheme } from "@/context/ThemeContext";
import { Spacing } from "@/constants/tokens";

type ToggleType = "like" | "watchlist";

interface ToggleButtonProps {
  type: ToggleType;
  isActive: boolean;
  onToggle: (newState: boolean) => void;
  size?: number;
  style?: ViewStyle;
}

const CONFIG: Record<ToggleType, {
  activeSymbol: string;
  inactiveSymbol: string;
  activeLabel: string;
  inactiveLabel: string;
}> = {
  like: {
    activeSymbol: "heart.fill",
    inactiveSymbol: "heart",
    activeLabel: "Unlike",
    inactiveLabel: "Like",
  },
  watchlist: {
    activeSymbol: "bookmark.fill",
    inactiveSymbol: "bookmark",
    activeLabel: "Remove from watchlist",
    inactiveLabel: "Add to watchlist",
  },
};

export function ToggleButton({ type, isActive, onToggle, size = 24, style }: ToggleButtonProps) {
  const { colors } = useTheme();
  const config = CONFIG[type];
  const symbolName = isActive ? config.activeSymbol : config.inactiveSymbol;
  const label = isActive ? config.activeLabel : config.inactiveLabel;
  const tintColor = type === "like" && isActive ? "#FF375F" : colors.accent;

  async function handlePress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(!isActive);
  }

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[styles.button, style]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: isActive }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <SymbolView
        name={symbolName as any}
        size={size}
        tintColor={isActive ? tintColor : colors.secondaryLabel}
        weight="regular"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: Spacing.xs,
  },
});
