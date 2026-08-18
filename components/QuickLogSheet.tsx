import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { Radius, Spacing, backdropUrl, posterUrl } from '@/constants/tokens';
import { StarRatingControl } from '@/components/StarRatingControl';
import { logWatch, getLogEntriesForMedia, type LogEntry } from '@/db/logEntries';
import { getMovie, setRating } from '@/db/movies';
import { isLiked, toggleLike } from '@/db/likes';

export interface QuickLogSheetProps {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath?: string | null;
  genreLabel?: string | null;
  releaseYear?: number | null;
  dominantColor?: string | null;
  existingRating: number | null;
  existingReview: string | null;
  /** Fired whenever the user persists a change (rating, review, or diary entry). */
  onChange: () => void;
  onDismiss: () => void;
}

/** Fixed cinematic dark palette — matches Stitch design system */
const CINEMA = {
  background: '#131313',
  surfaceContainer: '#201F1F',
  surfaceContainerLow: 'rgba(28, 27, 27, 0.65)',
  surfaceContainerHigh: 'rgba(42, 42, 42, 0.6)',
  surfaceContainerHighest: '#353534',
  onSurface: '#E5E2E1',
  onSurfaceVariant: '#E9BCB6',
  onSurfaceVariantDim: 'rgba(233, 188, 182, 0.6)',
  onSurfaceDim: 'rgba(229, 226, 225, 0.75)',
  primary: '#FFB4AA',
  primaryDim: 'rgba(255, 180, 170, 0.6)',
  primaryTint: 'rgba(255, 180, 170, 0.12)',
  onPrimary: '#690003',
  primaryContainer: '#E50914',
  starEmpty: '#474747',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
};

const ORDINAL_WORDS = ['First Watch', '2nd Rewatch', '3rd Rewatch', '4th Rewatch', '5th Rewatch'];

function ordinalLabel(watchNumber: number): string {
  if (watchNumber <= ORDINAL_WORDS.length) return ORDINAL_WORDS[watchNumber - 1];
  return `${watchNumber}th Rewatch`;
}

function formatDiaryDate(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
}

export function QuickLogSheet({
  tmdbId,
  title,
  posterPath,
  backdropPath,
  genreLabel,
  releaseYear,
  existingRating,
  existingReview,
  onChange,
  onDismiss,
}: QuickLogSheetProps) {
  const [rating, setRatingValue] = useState<number | null>(existingRating);
  const [review, setReview] = useState(existingReview ?? '');
  const [liked, setLiked] = useState(() => isLiked(tmdbId, 'movie'));
  const [entries, setEntries] = useState<LogEntry[]>(() => getLogEntriesForMedia(tmdbId, 'movie'));
  const [addingEntry, setAddingEntry] = useState(false);
  const [newNote, setNewNote] = useState('');

  const imageUri = backdropUrl(backdropPath, 'w780') ?? posterUrl(posterPath, 'w780');

  function handleFavoriteToggle() {
    const next = toggleLike(tmdbId, 'movie');
    setLiked(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange();
  }

  function handleRatingChange(value: number) {
    setRatingValue(value);
    const currentReview = getMovie(tmdbId)?.my_review ?? null;
    setRating(tmdbId, value, currentReview, true);
    onChange();
  }

  function postReview() {
    const reviewTrimmed = review.trim();
    const existing = getMovie(tmdbId)?.my_review ?? null;
    const wouldOverwrite = !!existing && reviewTrimmed !== existing && reviewTrimmed !== '';

    const executePost = () => {
      setRating(tmdbId, rating, reviewTrimmed || null, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onChange();
    };

    if (wouldOverwrite) {
      Alert.alert(
        'Overwrite Existing Review?',
        'You already have a saved review for this movie. Posting this will overwrite it app-wide.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Overwrite', style: 'destructive', onPress: executePost },
        ],
      );
    } else {
      executePost();
    }
  }

  function saveNewEntry() {
    const todayStr = new Date().toISOString().split('T')[0];
    logWatch(tmdbId, 'movie', todayStr, newNote.trim() || null);
    setEntries(getLogEntriesForMedia(tmdbId, 'movie'));
    setNewNote('');
    setAddingEntry(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChange();
  }

  return (
    <View style={styles.root}>
      {/* Ambient background glows */}
      <View style={styles.ambientGlowTop} pointerEvents="none" />
      <View style={styles.ambientGlowBottom} pointerEvents="none" />

      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Top Glass Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.headerButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <SymbolView name="chevron.left" size={20} tintColor={CINEMA.onSurface} weight="semibold" />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              Rate And Review
            </Text>
            <View style={styles.avatarBadge}>
              <SymbolView name="person.fill" size={16} tintColor={CINEMA.onPrimary} />
            </View>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Backdrop */}
            <View style={styles.hero}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: CINEMA.surfaceContainer }]} />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(19, 19, 19, 0.65)', CINEMA.background]}
                locations={[0, 0.65, 1.0]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroContent}>
                <View style={styles.titleRow}>
                  <View style={{ flex: 1, paddingRight: Spacing.sm }}>
                    <View style={styles.tagRow}>
                      {genreLabel ? (
                        <View style={styles.genrePill}>
                          <Text style={styles.genrePillText}>{genreLabel.toUpperCase()}</Text>
                        </View>
                      ) : null}
                      {releaseYear ? <Text style={styles.yearText}>{releaseYear}</Text> : null}
                    </View>
                    <Text style={styles.titleText} numberOfLines={2}>
                      {title}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleFavoriteToggle}
                    style={[
                      styles.favoriteButton,
                      liked && styles.favoriteButtonActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={liked ? 'Unfavorite' : 'Favorite'}
                    accessibilityState={{ selected: liked }}
                  >
                    <SymbolView
                      name={liked ? 'heart.fill' : 'heart'}
                      size={26}
                      tintColor={liked ? CINEMA.primary : CINEMA.onSurface}
                      weight="regular"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.content}>
              {/* Rating Section */}
              <View style={styles.ratingCard}>
                <Text style={styles.ratingLabel}>Your Rating</Text>
                <StarRatingControl
                  value={rating}
                  onChange={handleRatingChange}
                  size={40}
                  color={CINEMA.primary}
                  emptyColor={CINEMA.starEmpty}
                />
              </View>

              {/* Public Review */}
              <View style={styles.section}>
                <Text style={styles.sectionHeading}>Public Review</Text>
                <View style={styles.reviewCard}>
                  <TextInput
                    style={styles.reviewInput}
                    value={review}
                    onChangeText={setReview}
                    placeholder="What did you think of the visual effects?"
                    placeholderTextColor={CINEMA.onSurfaceVariantDim}
                    multiline
                    textAlignVertical="top"
                  />
                  <View style={styles.reviewFooterRow}>
                    <Text style={styles.visibleText}>Visible on your profile</Text>
                    <TouchableOpacity style={styles.postButton} onPress={postReview} activeOpacity={0.85}>
                      <Text style={styles.postButtonText}>Post</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Private Diary */}
              <View style={styles.section}>
                <View style={styles.diaryHeaderRow}>
                  <Text style={styles.sectionHeading}>Private Diary</Text>
                  <TouchableOpacity
                    style={styles.newEntryButton}
                    onPress={() => setAddingEntry((v) => !v)}
                    activeOpacity={0.85}
                  >
                    <SymbolView name="plus" size={14} tintColor={CINEMA.primary} weight="bold" />
                    <Text style={styles.newEntryButtonText}>New Entry</Text>
                  </TouchableOpacity>
                </View>

                {addingEntry ? (
                  <View style={styles.newEntryCard}>
                    <TextInput
                      style={styles.newEntryInput}
                      value={newNote}
                      onChangeText={setNewNote}
                      placeholder="Any thoughts on this watch? (optional)"
                      placeholderTextColor={CINEMA.onSurfaceVariantDim}
                      multiline
                      textAlignVertical="top"
                    />
                    <View style={styles.newEntryActions}>
                      <TouchableOpacity
                        onPress={() => {
                          setAddingEntry(false);
                          setNewNote('');
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.cancelText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.saveEntryButton} onPress={saveNewEntry} activeOpacity={0.85}>
                        <Text style={styles.saveEntryButtonText}>Save Entry</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}

                {entries.length === 0 && !addingEntry ? (
                  <Text style={styles.emptyDiaryText}>
                    No diary entries yet. Log a watch to start your private diary.
                  </Text>
                ) : (
                  <View style={{ gap: Spacing.sm }}>
                    {entries.map((entry, index) => {
                      const watchNumber = entries.length - index;
                      const label = ordinalLabel(watchNumber);
                      const dimmed = watchNumber === 1;
                      return (
                        <View key={entry.id} style={styles.diaryEntryCard}>
                          <View style={styles.diaryEntryHeaderRow}>
                            <Text
                              style={[
                                styles.diaryEntryLabel,
                                { color: dimmed ? CINEMA.primaryDim : CINEMA.primary },
                              ]}
                            >
                              {label.toUpperCase()}
                            </Text>
                            <Text style={styles.diaryEntryDate}>{formatDiaryDate(entry.watched_date)}</Text>
                          </View>
                          {entry.note ? (
                            <Text style={styles.diaryEntryNote} numberOfLines={3}>
                              {entry.note}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: CINEMA.background,
    overflow: 'hidden',
  },
  ambientGlowTop: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 180, 170, 0.12)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: 80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(0, 114, 215, 0.08)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(19, 19, 19, 0.75)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: CINEMA.glassBorder,
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: CINEMA.onSurface,
    letterSpacing: -0.3,
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: CINEMA.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  hero: {
    height: 350,
    width: '100%',
    overflow: 'hidden',
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 6,
  },
  genrePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: CINEMA.surfaceContainerHighest,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  genrePillText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    color: CINEMA.onSurfaceVariant,
  },
  yearText: {
    fontSize: 11,
    fontWeight: '500',
    color: CINEMA.onSurfaceVariant,
  },
  titleText: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
    color: CINEMA.onSurface,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(32, 31, 31, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteButtonActive: {
    borderColor: 'rgba(255, 180, 170, 0.5)',
    shadowColor: CINEMA.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    gap: Spacing.lg,
  },
  ratingCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: 16,
    backgroundColor: CINEMA.surfaceContainerLow,
    borderWidth: 1,
    borderColor: CINEMA.glassBorder,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: CINEMA.onSurfaceVariant,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: -0.3,
    color: CINEMA.onSurface,
  },
  reviewCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(32, 31, 31, 0.5)',
    borderWidth: 1,
    borderColor: CINEMA.glassBorder,
    overflow: 'hidden',
  },
  reviewInput: {
    minHeight: 120,
    padding: Spacing.md,
    fontSize: 16,
    lineHeight: 24,
    color: CINEMA.onSurface,
  },
  reviewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CINEMA.glassBorder,
  },
  visibleText: {
    fontSize: 11,
    color: CINEMA.onSurfaceVariantDim,
  },
  postButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: CINEMA.primary,
    shadowColor: CINEMA.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: CINEMA.onPrimary,
  },
  diaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newEntryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: CINEMA.primaryTint,
    borderWidth: 1,
    borderColor: 'rgba(255, 180, 170, 0.2)',
  },
  newEntryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: CINEMA.primary,
  },
  newEntryCard: {
    borderRadius: 12,
    backgroundColor: CINEMA.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: CINEMA.glassBorder,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  newEntryInput: {
    minHeight: 65,
    padding: Spacing.sm,
    fontSize: 15,
    lineHeight: 21,
    color: CINEMA.onSurface,
  },
  newEntryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: CINEMA.onSurfaceDim,
  },
  saveEntryButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: CINEMA.primary,
  },
  saveEntryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: CINEMA.onPrimary,
  },
  emptyDiaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: CINEMA.onSurfaceDim,
  },
  diaryEntryCard: {
    borderRadius: 12,
    backgroundColor: CINEMA.surfaceContainerLow,
    borderWidth: 1,
    borderColor: CINEMA.glassBorder,
    padding: Spacing.md,
    gap: 6,
  },
  diaryEntryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  diaryEntryLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  diaryEntryDate: {
    fontSize: 12,
    color: CINEMA.onSurfaceVariantDim,
  },
  diaryEntryNote: {
    fontSize: 14,
    lineHeight: 20,
    color: CINEMA.onSurfaceDim,
  },
});
