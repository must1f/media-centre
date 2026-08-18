import React from 'react';
import { Text, StyleSheet, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Radius, Spacing, FontSize, FontWeight } from '@/constants/tokens';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface GenreConfig {
  bg: string;
  icon: string;
  image?: string;
}

const GENRE_STYLES: Record<string, GenreConfig> = {
  Action: {
    bg: '#8B0000',
    icon: 'flame.fill',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=400&auto=format&fit=crop',
  },
  Adventure: {
    bg: '#4A154B',
    icon: 'map.fill',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&auto=format&fit=crop',
  },
  Animation: {
    bg: '#B45309',
    icon: 'sparkles',
    image: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=400&auto=format&fit=crop',
  },
  Comedy: {
    bg: '#A21CAF',
    icon: 'face.smiling.fill',
    image: 'https://images.unsplash.com/photo-1514306191717-452ec28c7814?q=80&w=400&auto=format&fit=crop',
  },
  Crime: {
    bg: '#1F2937',
    icon: 'shield.fill',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop',
  },
  Documentary: {
    bg: '#0369A1',
    icon: 'video.fill',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop',
  },
  Drama: {
    bg: '#312E81',
    icon: 'theatermasks.fill',
    image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=400&auto=format&fit=crop',
  },
  Family: {
    bg: '#047857',
    icon: 'heart.fill',
    image: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=400&auto=format&fit=crop',
  },
  Fantasy: {
    bg: '#6D28D9',
    icon: 'wand.and.stars',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop',
  },
  History: {
    bg: '#78350F',
    icon: 'book.fill',
    image: 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?q=80&w=400&auto=format&fit=crop',
  },
  Horror: {
    bg: '#7F1D1D',
    icon: 'moon.stars.fill',
    image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=400&auto=format&fit=crop',
  },
  Music: {
    bg: '#BE185D',
    icon: 'music.note',
    image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
  },
  Mystery: {
    bg: '#374151',
    icon: 'magnifyingglass',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop',
  },
  Romance: {
    bg: '#9D174D',
    icon: 'heart.circle.fill',
    image: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=400&auto=format&fit=crop',
  },
  'Science Fiction': {
    bg: '#075985',
    icon: 'globe.americas.fill',
    image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=400&auto=format&fit=crop',
  },
  'TV Movie': {
    bg: '#3730A3',
    icon: 'tv.fill',
    image: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=400&auto=format&fit=crop',
  },
  Thriller: {
    bg: '#111827',
    icon: 'bolt.fill',
    image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop',
  },
  War: {
    bg: '#44403C',
    icon: 'flag.fill',
    image: 'https://images.unsplash.com/photo-1509248961158-e54f6934749c?q=80&w=400&auto=format&fit=crop',
  },
  Western: {
    bg: '#92400E',
    icon: 'sun.max.fill',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=400&auto=format&fit=crop',
  },
};

const DEFAULT_GENRE_COLORS = [
  '#8B0000', '#6D28D9', '#0369A1', '#047857', '#BE185D', '#B45309', '#312E81',
];

interface GenreTileProps {
  name: string;
  index: number;
  onPress: () => void;
  style?: ViewStyle;
}

export function GenreTile({ name, index, onPress, style }: GenreTileProps) {
  const config = GENRE_STYLES[name] ?? {
    bg: DEFAULT_GENRE_COLORS[index % DEFAULT_GENRE_COLORS.length],
    icon: 'film.fill',
  };

  return (
    <AnimatedPressable
      style={[styles.tile, { backgroundColor: config.bg }, style]}
      onPress={onPress}
      scaleTo={0.93}
      accessibilityRole="button"
      accessibilityLabel={`Browse ${name} movies`}
    >
      {/* Background Image if present */}
      {config.image ? (
        <Image
          source={{ uri: config.image }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
        />
      ) : null}

      {/* Dark gradient scrims from Stitch */}
      <View style={[StyleSheet.absoluteFill, styles.gradientOverlay, { backgroundColor: config.bg + '55' }]} />
      <View style={[StyleSheet.absoluteFill, styles.bottomScrim]} />

      {/* Background Icon Watermark */}
      <View style={styles.iconWatermark}>
        <SymbolView
          name={config.icon as any}
          size={42}
          tintColor="rgba(255, 255, 255, 0.25)"
          weight="bold"
        />
      </View>

      {/* Label */}
      <View style={styles.labelContainer}>
        <Text style={styles.label} numberOfLines={1}>
          {name}
        </Text>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: Radius.card,
    height: 96,
    overflow: 'hidden',
    position: 'relative',
    // @ts-ignore
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  gradientOverlay: {
    opacity: 0.8,
  },
  bottomScrim: {
    backgroundColor: 'rgba(19, 19, 19, 0.65)',
  },
  iconWatermark: {
    position: 'absolute',
    right: 8,
    top: 8,
  },
  labelContainer: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
  },
  label: {
    color: '#E5E2E1',
    fontSize: FontSize.headline,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    zIndex: 2,
  },
});
