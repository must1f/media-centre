import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useTheme } from "@/context/ThemeContext";
import { FontSize, FontWeight, Radius, Spacing } from "@/constants/tokens";
import { posterUrl } from "@/constants/tokens";

interface CompactLibraryRowProps {
  title: string;
  posterPath: string | null;
  releaseYear?: number | null;
  rating?: number | null;
  watchedDate?: string | null;
  onPress: () => void;
}

export function CompactLibraryRow({
  title,
  posterPath,
  releaseYear,
  rating,
  watchedDate,
  onPress,
}: CompactLibraryRowProps) {
  const { colors } = useTheme();
  const imageUrl = posterUrl(posterPath, "w185");

  const metaParts: string[] = [];
  if (releaseYear) metaParts.push(String(releaseYear));
  if (rating) metaParts.push("★ " + rating.toFixed(1));
  if (watchedDate) metaParts.push(watchedDate);

  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: colors.separator }]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={title + (releaseYear ? ", " + releaseYear : "")}
    >
      {/* Thumbnail */}
      <View style={[styles.thumb, { backgroundColor: colors.secondaryBackground }]}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : null}
      </View>

      {/* Text */}
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.label }]} numberOfLines={1}>
          {title}
        </Text>
        {metaParts.length > 0 ? (
          <Text style={[styles.meta, { color: colors.secondaryLabel }]} numberOfLines={1}>
            {metaParts.join(" · ")}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const THUMB_SIZE = 48;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: THUMB_SIZE,
    height: Math.round(THUMB_SIZE * 1.5),
    borderRadius: Radius.small,
    overflow: "hidden",
    // @ts-ignore
    borderCurve: "continuous",
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.semibold,
  },
  meta: {
    fontSize: FontSize.subheadline,
  },
});
