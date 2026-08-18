import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing, backdropUrl, posterUrl } from '@/constants/tokens';
import { getVideos, pickTrailer, type TmdbMovie } from '@/services/tmdb';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface FeaturedHeroBannerProps {
  movie: TmdbMovie;
  onPress: () => void;
}

export function FeaturedHeroBanner({ movie, onPress }: FeaturedHeroBannerProps) {
  const { colors, colorScheme } = useTheme();
  const imageUrl = backdropUrl(movie.backdrop_path, 'w780') ?? posterUrl(movie.poster_path, 'w780');
  const releaseYear = movie.release_date ? movie.release_date.slice(0, 4) : null;
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : null;
  const [loadingTrailer, setLoadingTrailer] = useState(false);

  async function handleWatchTrailer() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoadingTrailer(true);
    try {
      const videos = await getVideos(movie.id);
      const trailer = pickTrailer(videos);
      if (!trailer) {
        Alert.alert('No trailer available', `We couldn't find a YouTube trailer for ${movie.title}.`);
        return;
      }
      const appUrl = `youtube://${trailer.key}`;
      const webUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
      const canOpenApp = await Linking.canOpenURL(appUrl);
      await Linking.openURL(canOpenApp ? appUrl : webUrl);
    } catch {
      Alert.alert('Something went wrong', 'Unable to load the trailer right now.');
    } finally {
      setLoadingTrailer(false);
    }
  }

  // Stitch subtle ambient glow pulse
  const glowOpacity = useSharedValue(0.45);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: glowOpacity.value,
  }));

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.94}
      accessibilityRole="button"
      accessibilityLabel={`Featured movie: ${movie.title}`}
    >
      <View
        style={[
          styles.bannerCard,
          {
            backgroundColor: colors.secondaryBackground,
            borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
            borderWidth: 1,
            ...colors.cardShadow,
          },
        ]}
      >
        {/* Backdrop Image */}
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
        ) : null}

        {/* Cinematic Gradient Overlays */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor:
                colorScheme === 'dark'
                  ? 'rgba(19, 19, 19, 0.45)'
                  : 'rgba(0, 0, 0, 0.35)',
            },
          ]}
        />
        <View style={styles.bottomGradient} />

        {/* Floating Top Badges (Stitch Style) */}
        <View style={styles.topBadgeContainer}>
          <BlurView
            intensity={70}
            tint="dark"
            style={styles.featuredBadge}
          >
            <Text style={styles.featuredBadgeText}>EXCLUSIVE</Text>
          </BlurView>

          <View style={[styles.trendingBadge, { backgroundColor: 'rgba(0, 0, 0, 0.65)' }]}>
            <SymbolView name="chart.line.uptrend.xyaxis" size={11} tintColor={colors.accent} weight="bold" />
            <Text style={[styles.trendingBadgeText, { color: colors.accent }]}>#1 SPOTLIGHT</Text>
          </View>
        </View>

        {/* Hero Info Content */}
        <View style={styles.heroContent}>
          <View style={styles.metaRow}>
            {rating ? (
              <View style={styles.ratingPill}>
                <SymbolView name="star.fill" size={11} tintColor={colors.starGold} weight="bold" />
                <Text style={styles.ratingText}>{rating}</Text>
              </View>
            ) : null}
            {releaseYear ? (
              <Text style={styles.metaYear}>{releaseYear}</Text>
            ) : null}
          </View>

          <Text style={styles.movieTitle} numberOfLines={2}>
            {movie.title}
          </Text>

          {movie.overview ? (
            <Text style={styles.overview} numberOfLines={2}>
              {movie.overview}
            </Text>
          ) : null}

          {/* CTA Action Row: Watch Now + Glass Plus Button (Exact Stitch Spec) */}
          <View style={styles.ctaRow}>
            <Animated.View
              style={[
                styles.ctaButton,
                {
                  backgroundColor: colors.accent,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 6 },
                  shadowRadius: 14,
                  elevation: 8,
                },
                animatedGlowStyle,
              ]}
            >
              <TouchableOpacity
                style={styles.ctaButtonInner}
                onPress={handleWatchTrailer}
                activeOpacity={0.8}
                disabled={loadingTrailer}
                accessibilityRole="button"
                accessibilityLabel={`Watch trailer for ${movie.title}`}
              >
                {loadingTrailer ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <SymbolView name="play.fill" size={14} tintColor="#FFFFFF" weight="heavy" />
                )}
                <Text style={styles.ctaButtonText}>Watch Now</Text>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.glassPlusButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onPress();
              }}
              activeOpacity={0.7}
            >
              <SymbolView name="plus" size={18} tintColor="#FFFFFF" weight="bold" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  bannerCard: {
    height: Math.round(SCREEN_WIDTH * 0.78),
    borderRadius: Radius.card,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
    position: 'relative',
    justifyContent: 'space-between',
  },
  bottomGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '75%',
    backgroundColor: 'rgba(19, 19, 19, 0.70)',
  },
  topBadgeContainer: {
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
    zIndex: 2,
  },
  featuredBadge: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  featuredBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeight.heavy,
    letterSpacing: 1,
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
  },
  trendingBadgeText: {
    fontSize: 9,
    fontWeight: FontWeight.heavy,
    letterSpacing: 0.8,
  },
  heroContent: {
    padding: Spacing.md,
    gap: Spacing.xs + 1,
    zIndex: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: Radius.small,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  ratingText: {
    color: '#FFFFFF',
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.bold,
  },
  metaYear: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.semibold,
  },
  movieTitle: {
    color: '#FFFFFF',
    fontSize: FontSize.title2,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  overview: {
    color: 'rgba(229, 226, 225, 0.85)',
    fontSize: FontSize.caption1,
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs + 2,
  },
  ctaButton: {
    flex: 1,
    borderRadius: Radius.medium,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  ctaButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm + 4,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.heavy,
    letterSpacing: 0.2,
  },
  glassPlusButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    // @ts-ignore
    borderCurve: 'continuous',
  },
});
