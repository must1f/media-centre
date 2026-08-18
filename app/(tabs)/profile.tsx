import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { ACCENT_PALETTE, type AppearanceMode } from '@/services/settings';
import { AnimatedPressable } from '@/components/AnimatedPressable';

// DB CRUD functions
import { getAllCachedMovies, type Movie } from '@/db/movies';
import { getAllLogEntries, type LogEntry } from '@/db/logEntries';
import { getWatchlistIds } from '@/db/watchlist';

const PROFILE_AVATAR_URL =
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400&auto=format&fit=crop';

export default function ProfileScreen() {
  const { colors, colorScheme, appearanceMode, setAppearanceMode, accentColor, setAccentColor } = useTheme();

  // Data State
  const [movies, setMovies] = useState<Movie[]>([]);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [watchlistIds, setWatchlistIds] = useState<number[]>([]);
  const [watchlistSeriesIds, setWatchlistSeriesIds] = useState<number[]>([]);
  const [showAppearanceModal, setShowAppearanceModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setMovies(getAllCachedMovies());
      setLogEntries(getAllLogEntries());
      setWatchlistIds(getWatchlistIds('movie'));
      setWatchlistSeriesIds(getWatchlistIds('series'));
    }, [])
  );

  // Statistics calculation (or fallback to Stitch baseline values if empty)
  const totalWatched = logEntries.length > 0 ? logEntries.length : 342;
  const uniqueWatchedSet = new Set(logEntries.map((l) => l.movie_id));
  const uniqueWatched = uniqueWatchedSet.size > 0 ? uniqueWatchedSet.size : 89;
  const diaryCount = logEntries.length > 0 ? logEntries.length : 152;
  const hoursCount = logEntries.length > 0 ? (logEntries.length * 1.8).toFixed(1) + 'h' : '1.2k';
  const totalWatchlistCount = watchlistIds.length + watchlistSeriesIds.length;
  const watchlistCount = totalWatchlistCount > 0 ? totalWatchlistCount : 89;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Stitch Top Sticky Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View
            style={[
              styles.brandLogo,
              {
                backgroundColor: colors.accent,
                shadowColor: colors.accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.45,
                shadowRadius: 8,
                elevation: 4,
              },
            ]}
          >
            <SymbolView name="sparkles" size={16} tintColor="#FFFFFF" weight="heavy" />
          </View>
          <Text style={[styles.headerTitle, { color: colors.label }]}>Profile</Text>
        </View>

        <Image
          source={{ uri: PROFILE_AVATAR_URL }}
          style={[styles.smallHeaderAvatar, { borderColor: colors.accent, borderWidth: 1.5 }]}
          contentFit="cover"
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* User Hero Section (Centered Avatar with Glow & Edit Badge) */}
        <View style={styles.heroSection}>
          <View style={styles.avatarWrapper}>
            {/* Stitch: absolute -inset-1 bg-gradient-to-tr from-primary to-tertiary rounded-full blur opacity-20 */}
            <View style={[styles.avatarGlow, { backgroundColor: '#ffb4aa' }]} />
            <Image
              source={{ uri: PROFILE_AVATAR_URL }}
              // Stitch: ring-2 ring-surface-variant z-10
              style={[styles.largeAvatar, { borderColor: '#353534', borderWidth: 2 }]}
              contentFit="cover"
              transition={200}
            />
            {/* Edit Pencil Badge — Stitch: w-8 h-8 bg-surface-container-highest rounded-full ring-2 ring-background */}
            <TouchableOpacity
              style={[
                styles.editPencilBadge,
                {
                  backgroundColor: '#353534', // surface-container-highest
                  borderColor: '#131313', // background
                },
              ]}
              activeOpacity={0.8}
              onPress={() => setShowAppearanceModal(!showAppearanceModal)}
            >
              <SymbolView name="pencil" size={13} tintColor="#e5e2e1" weight="bold" />
            </TouchableOpacity>
          </View>

          {/* Stitch: font-headline-md text-headline-md (24px/600) */}
          <Text style={[styles.userName, { color: '#e5e2e1' }]}>Alex Mercer</Text>

          {/* Stitch: inline-flex items-center gap-1 mt-1 bg-surface-variant/50 px-3 py-1 rounded-full backdrop-blur-sm */}
          <View
            style={[
              styles.roleBadge,
              {
                backgroundColor: 'rgba(53, 53, 52, 0.5)',
                // No border — Stitch has border-none
                borderWidth: 0,
              },
            ]}
          >
            {/* Stitch: text-tertiary-container (#0072d7) FILL=1 stars icon */}
            <SymbolView name="star.circle.fill" size={14} tintColor="#0072D7" weight="bold" />
            {/* Stitch: font-label-sm text-on-surface-variant uppercase tracking-widest */}
            <Text style={[styles.roleBadgeText, { color: '#e9bcb6', letterSpacing: 2, textTransform: 'uppercase' }]}>Movie Critic</Text>
          </View>
        </View>

        {/* Section 1: Viewing Statistics (Exact Stitch Spec) */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>Viewing Statistics</Text>
          <View style={styles.statsGrid}>
            {/* Movies */}
            <View
              style={[
                styles.statCard,
                {
                  // Stitch: bg-surface-container p-4 rounded-xl
                  backgroundColor: '#201f1f',
                  borderWidth: 0,
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: '#FFB4AA' }]}>{totalWatched}</Text>
              <Text style={[styles.statUnit, { color: colors.secondaryLabel }]}>MOVIES</Text>
            </View>

            {/* Series */}
            <View
              style={[
                styles.statCard,
                {
                  // Stitch: bg-surface-container p-4 rounded-xl
                  backgroundColor: '#201f1f',
                  borderWidth: 0,
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: '#A7C8FF' }]}>{uniqueWatched}</Text>
              <Text style={[styles.statUnit, { color: colors.secondaryLabel }]}>SERIES</Text>
            </View>

            {/* Hours */}
            <View
              style={[
                styles.statCard,
                {
                  // Stitch: bg-surface-container p-4 rounded-xl
                  backgroundColor: '#201f1f',
                  borderWidth: 0,
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: colors.accent }]}>{hoursCount}</Text>
              <Text style={[styles.statUnit, { color: colors.secondaryLabel }]}>HOURS</Text>
            </View>

            {/* Diaries */}
            <View
              style={[
                styles.statCard,
                {
                  // Stitch: bg-surface-container p-4 rounded-xl
                  backgroundColor: '#201f1f',
                  borderWidth: 0,
                },
              ]}
            >
              <Text style={[styles.statNumber, { color: '#C8C6C6' }]}>{diaryCount}</Text>
              <Text style={[styles.statUnit, { color: colors.secondaryLabel }]}>DIARIES</Text>
            </View>
          </View>
        </View>

        {/* Section 2: Taste Profile */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>Taste Profile</Text>
          <View style={styles.tastePillRow}>
            <View
              style={[
                styles.tastePill,
                {
                  backgroundColor: 'rgba(229, 9, 20, 0.20)',
                  borderColor: 'rgba(229, 9, 20, 0.35)',
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.tastePillText, { color: '#FFB4AA' }]}>Sci-Fi</Text>
            </View>

            <View
              style={[
                styles.tastePill,
                {
                  backgroundColor: 'rgba(53, 53, 52, 0.65)',
                  borderColor: 'rgba(255, 255, 255, 0.12)',
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.tastePillText, { color: '#E5E2E1' }]}>Noir</Text>
            </View>

            <View
              style={[
                styles.tastePill,
                {
                  backgroundColor: 'rgba(0, 114, 215, 0.20)',
                  borderColor: 'rgba(0, 114, 215, 0.35)',
                  borderWidth: 1,
                },
              ]}
            >
              <Text style={[styles.tastePillText, { color: '#A7C8FF' }]}>Thriller</Text>
            </View>
          </View>
        </View>

        {/* Section 3: Quick Access (Exact Stitch Spec) */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>Quick Access</Text>
          <View style={styles.quickAccessGrid}>
            {/* Liked Media */}
            <AnimatedPressable
              style={[
                styles.quickAccessCard,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: colorScheme === 'dark' ? 0 : 1,
                },
              ]}
              onPress={() => router.push('/library')}
              scaleTo={0.94}
            >
              <SymbolView name="heart" size={20} tintColor="#FFB4AA" weight="bold" />
              <View style={styles.quickAccessMeta}>
                <Text style={[styles.quickAccessTitle, { color: colors.label }]}>Liked Media</Text>
                <Text style={[styles.quickAccessSub, { color: colors.secondaryLabel }]}>420 items</Text>
              </View>
            </AnimatedPressable>

            {/* Private Diaries */}
            <AnimatedPressable
              style={[
                styles.quickAccessCard,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: colorScheme === 'dark' ? 0 : 1,
                },
              ]}
              onPress={() => router.push('/library')}
              scaleTo={0.94}
            >
              <SymbolView name="book.closed" size={20} tintColor="#A7C8FF" weight="bold" />
              <View style={styles.quickAccessMeta}>
                <Text style={[styles.quickAccessTitle, { color: colors.label }]}>Private Diaries</Text>
                <Text style={[styles.quickAccessSub, { color: colors.secondaryLabel }]}>{diaryCount} entries</Text>
              </View>
            </AnimatedPressable>

            {/* Watchlist */}
            <AnimatedPressable
              style={[
                styles.quickAccessCard,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: colorScheme === 'dark' ? 0 : 1,
                },
              ]}
              onPress={() => router.push('/library')}
              scaleTo={0.94}
            >
              <SymbolView name="bookmark" size={20} tintColor="#C8C6C6" weight="bold" />
              <View style={styles.quickAccessMeta}>
                <Text style={[styles.quickAccessTitle, { color: colors.label }]}>Watchlist</Text>
                <Text style={[styles.quickAccessSub, { color: colors.secondaryLabel }]}>{watchlistCount} upcoming</Text>
              </View>
            </AnimatedPressable>

            {/* Achievements */}
            <AnimatedPressable
              style={[
                styles.quickAccessCard,
                {
                  backgroundColor:
                    colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: colorScheme === 'dark' ? 0 : 1,
                },
              ]}
              scaleTo={0.94}
            >
              <SymbolView name="medal.fill" size={20} tintColor={colors.accent} weight="bold" />
              <View style={styles.quickAccessMeta}>
                <Text style={[styles.quickAccessTitle, { color: colors.label }]}>Achievements</Text>
                <Text style={[styles.quickAccessSub, { color: colors.secondaryLabel }]}>12 badges</Text>
              </View>
            </AnimatedPressable>

            {/* Your Year recap */}
            <AnimatedPressable
              style={[
                styles.quickAccessCard,
                {
                  backgroundColor: colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: colorScheme === 'dark' ? 0 : 1,
                },
              ]}
              onPress={() => router.push('/year-recap')}
              scaleTo={0.94}
            >
              <SymbolView name="sparkles" size={20} tintColor={colors.accent} weight="bold" />
              <View style={styles.quickAccessMeta}>
                <Text style={[styles.quickAccessTitle, { color: colors.label }]}>Your Year</Text>
                <Text style={[styles.quickAccessSub, { color: colors.secondaryLabel }]}>{new Date().getFullYear()} recap</Text>
              </View>
            </AnimatedPressable>
          </View>
        </View>

        {/* Section 4: System Options (Grouped Inset Card) */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>System</Text>
          <View
            style={[
              styles.groupedCard,
              {
                backgroundColor:
                  colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                borderWidth: colorScheme === 'dark' ? 0 : 1,
              },
            ]}
          >
            {/* Account Settings / Appearance */}
            <TouchableOpacity
              style={styles.systemRow}
              onPress={() => setShowAppearanceModal(!showAppearanceModal)}
              activeOpacity={0.75}
            >
              <View style={styles.systemLeft}>
                <View style={[styles.systemIconBadge, { backgroundColor: '#353534' }]}>
                  <SymbolView name="gearshape.fill" size={17} tintColor={colors.secondaryLabel} weight="medium" />
                </View>
                <Text style={[styles.systemRowTitle, { color: colors.label }]}>Account Settings</Text>
              </View>
              <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} weight="semibold" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Watch History */}
            <TouchableOpacity
              style={styles.systemRow}
              onPress={() => router.push('/library')}
              activeOpacity={0.75}
            >
              <View style={styles.systemLeft}>
                <View style={[styles.systemIconBadge, { backgroundColor: '#353534' }]}>
                  <SymbolView name="clock.arrow.circlepath" size={17} tintColor={colors.secondaryLabel} weight="medium" />
                </View>
                <Text style={[styles.systemRowTitle, { color: colors.label }]}>Watch History</Text>
              </View>
              <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} weight="semibold" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Subscription */}
            <TouchableOpacity style={styles.systemRow} activeOpacity={0.75}>
              <View style={styles.systemLeft}>
                <View style={[styles.systemIconBadge, { backgroundColor: '#353534' }]}>
                  <SymbolView name="film.stack" size={17} tintColor={colors.secondaryLabel} weight="medium" />
                </View>
                <View>
                  <Text style={[styles.systemRowTitle, { color: colors.label }]}>Subscription</Text>
                  <Text style={[styles.systemSub, { color: '#FFB4AA' }]}>Pro Plan</Text>
                </View>
              </View>
              <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} weight="semibold" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Import & Backup */}
            <TouchableOpacity
              style={styles.systemRow}
              onPress={() => router.push('/settings/data')}
              activeOpacity={0.75}
            >
              <View style={styles.systemLeft}>
                <View style={[styles.systemIconBadge, { backgroundColor: '#353534' }]}>
                  <SymbolView name="arrow.up.arrow.down.circle" size={17} tintColor="#A7C8FF" weight="medium" />
                </View>
                <Text style={[styles.systemRowTitle, { color: colors.label }]}>Import & Backup</Text>
              </View>
              <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} weight="semibold" />
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: 'rgba(255, 255, 255, 0.06)' }]} />

            {/* Help & Support */}
            <TouchableOpacity style={styles.systemRow} activeOpacity={0.75}>
              <View style={styles.systemLeft}>
                <View style={[styles.systemIconBadge, { backgroundColor: '#353534' }]}>
                  <SymbolView name="questionmark.circle" size={17} tintColor={colors.secondaryLabel} weight="medium" />
                </View>
                <Text style={[styles.systemRowTitle, { color: colors.label }]}>Help & Support</Text>
              </View>
              <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} weight="semibold" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Appearance & Accent Theme Customizer (Expanded on demand) */}
        {showAppearanceModal && (
          <View
            style={[
              styles.themeCustomizerCard,
              {
                backgroundColor:
                  colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)',
                borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                borderWidth: 1,
              },
            ]}
          >
            <Text style={[styles.customizerTitle, { color: colors.label }]}>Appearance Theme</Text>
            <View style={[styles.segmentedControl, { backgroundColor: colors.searchBarBackground }]}>
              {(['auto', 'light', 'dark'] as AppearanceMode[]).map((mode) => {
                const isSelected = appearanceMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.segmentButton,
                      isSelected && {
                        backgroundColor:
                          colorScheme === 'dark'
                            ? colors.tertiaryBackground
                            : colors.secondaryBackground,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAppearanceMode(mode);
                    }}
                  >
                    <Text
                      style={[
                        styles.segmentLabel,
                        {
                          color: isSelected ? colors.label : colors.secondaryLabel,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.medium,
                        },
                      ]}
                    >
                      {mode === 'auto' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.customizerTitle, { color: colors.label, marginTop: Spacing.md }]}>
              Accent Color
            </Text>
            <View style={styles.colorPalette}>
              {ACCENT_PALETTE.map((color) => {
                const isSelected = accentColor === color;
                return (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorCircle,
                      {
                        backgroundColor: color,
                        borderColor: isSelected ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)',
                        borderWidth: isSelected ? 2.5 : 1,
                        shadowColor: color,
                        shadowOpacity: isSelected ? 0.6 : 0.2,
                        shadowRadius: isSelected ? 8 : 4,
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setAccentColor(color);
                    }}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <SymbolView name="checkmark" size={14} tintColor="#FFFFFF" weight="heavy" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Log Out Pill Button (Exact Stitch Spec) */}
        <View style={styles.logoutWrapper}>
          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                borderColor: 'rgba(255, 180, 171, 0.45)',
                backgroundColor: 'transparent',
              },
            ]}
            activeOpacity={0.8}
          >
            <SymbolView name="rectangle.portrait.and.arrow.right" size={16} tintColor="#FFB4AB" weight="bold" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 130 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm + 2,
  },
  brandLogo: {
    width: 30,
    height: 30,
    borderRadius: Radius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.title2,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
  },
  smallHeaderAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.xs + 2,
  },
  avatarWrapper: {
    position: 'relative',
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarGlow: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    opacity: 0.35,
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 18,
  },
  largeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editPencilBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  userName: {
    fontSize: FontSize.title2,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.4,
    marginTop: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.pill,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: FontWeight.heavy,
    letterSpacing: 1.2,
  },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionHeading: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.1,
    marginBottom: Spacing.xs + 2,
    paddingHorizontal: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    width: '48.2%',
    paddingVertical: Spacing.md,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  statNumber: {
    fontSize: FontSize.title1,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
  },
  statUnit: {
    fontSize: 10,
    fontWeight: FontWeight.heavy,
    letterSpacing: 1.2,
  },
  tastePillRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: 2,
  },
  tastePill: {
    paddingHorizontal: Spacing.md + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
  },
  tastePillText: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickAccessCard: {
    width: '48.2%',
    padding: Spacing.md,
    borderRadius: Radius.card,
    gap: Spacing.sm,
  },
  quickAccessMeta: {
    gap: 2,
  },
  quickAccessTitle: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
  quickAccessSub: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.medium,
  },
  groupedCard: {
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  systemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  systemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  systemIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  systemRowTitle: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
  systemSub: {
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.bold,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  themeCustomizerCard: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.card,
  },
  customizerTitle: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.xs + 2,
  },
  segmentedControl: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: Radius.medium,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.small,
  },
  segmentLabel: {
    fontSize: FontSize.caption1,
  },
  colorPalette: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutWrapper: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    width: '100%',
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  logoutText: {
    color: '#FFB4AB',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
});
