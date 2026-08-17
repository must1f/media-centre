import React from "react";
import { TouchableOpacity, StyleSheet, View, Text, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Radius, Spacing, FontSize, FontWeight } from "@/constants/tokens";
import { useTheme } from "@/context/ThemeContext";
import { posterUrl } from "@/constants/tokens";

interface PosterGridCellProps {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  releaseYear?: number | null;
  onPress: () => void;
  style?: ViewStyle;
  /** Width of the cell — height is derived at 3:2 poster ratio */
  width?: number;
}

export function PosterGridCell({
  title,
  posterPath,
  releaseYear,
  onPress,
  style,
  width = 110,
}: PosterGridCellProps) {
  const { colors } = useTheme();
  const imageUrl = posterUrl(posterPath, "w342");
  const height = Math.round(width * 1.5);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.container, { width }, style]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={title + (releaseYear ? ", " + releaseYear : "")}
    >
      <View
        style={[
          styles.posterWrapper,
          { width, height, backgroundColor: colors.secondaryBackground },
        ]}
      >
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <Text style={[styles.placeholderText, { color: colors.secondaryLabel }]}
              numberOfLines={3}
            >
              {title}
            </Text>
          </View>
        )}
      </View>
      <Text
        style={[styles.title, { color: colors.label }]}
        numberOfLines={2}
      >
        {title}
      </Text>
      {releaseYear ? (
        <Text style={[styles.meta, { color: colors.secondaryLabel }]}>{releaseYear}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
  },
  posterWrapper: {
    borderRadius: Radius.medium,
    overflow: "hidden",
    // @ts-ignore
    borderCurve: "continuous",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
  },
  placeholderText: {
    fontSize: FontSize.caption,
    textAlign: "center",
  },
  title: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    lineHeight: 16,
  },
  meta: {
    fontSize: FontSize.caption,
  },
});
