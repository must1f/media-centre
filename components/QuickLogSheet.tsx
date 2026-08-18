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
import { FontWeight, Radius, Spacing, backdropUrl, posterUrl } from '@/constants/tokens';
import { StarRatingControl } from '@/components/StarRatingControl';
import { logWatch, getLogEntriesForMovie, type LogEntry } from '@/db/logEntries';
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

/** Fixed cinematic dark palette — this screen always renders dark, matching the Stitch design. */
const CINEMA = {
  background: '#131313',
  surfaceContainer: '#201F1F',
  surfaceContainerLow: 'rgba(28, 27, 27, 0.75)',
  surfaceContainerHigh: 'rgba(42, 42, 42, 0.6)',
  onSurface: '#E5E2E1',
  onSurfaceVariant: '#E9BCB6',
  onSurfaceVariantDim: 'rgba(233, 188, 182, 0.5)',
  onSurfaceDim: 'rgba(229, 226, 225, 0.7)',
  primary: '#FFB4AA',
  primaryDim: 'rgba(255, 180, 170, 0.6)',
  primaryTint: 'rgba(255, 180, 170, 0.1)',
  onPrimary: '#690003',
  starEmpty: '#8A8886',
  divider: 'rgba(255, 255, 255, 0.08)',
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
  const [liked, setLiked] = useState(() => isLiked(tmdbId));
  const [entries, setEntries] = useState<LogEntry[]>(() => getLogEntriesForMovie(tmdbId));
  const [addingEntry, setAddingEntry] = useState(false);
  const [newNote, setNewNote] = useState('');

  const imageUri = backdropUrl(backdropPath, 'w780') ?? posterUrl(posterPath, 'w780');

  function handleFavoriteToggle() {
    const next = toggleLike(tmdbId);
    setLiked(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onChange();
  }

  function handleRatingChange(value: number) {
    setRatingValue(value);
    // Preserve whatever review text was last posted — never leak an unsaved draft.
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
    logWatch(tmdbId, todayStr, newNote.trim() || null);
    setEntries(getLogEntriesForMovie(tmdbId));
    setNewNote('');
    setAddingEntry(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onChange();
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.headerButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
                colors={['transparent', CINEMA.background]}
                locations={[0, 0.92]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.heroContent}>
                <View style={styles.titleRow}>
                  <View style={{ flex: 1 }}>
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
                    style={styles.favoriteButton}
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
              {/* Rating */}
              <View style={styles.ratingCard}>
                <Text style={styles.ratingLabel}>Your Rating</Text>
                <StarRatingControl
                  value={rating}
                  onChange={handleRatingChange}
                  size={36}
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
                    <SymbolView name="plus" size={13} tintColor={CINEMA.primary} weight="bold" />
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
                            <Text style={styles.diaryEntryNote} numberOfLines={2}>
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
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: FontWeight.semibold,
    color: CINEMA.onSurface,
    letterSpacing: -0.2,
  },
  avatarBadge: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    backgroundColor: CINEMA.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  hero: {
    height: 300,
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
    gap: Spacing.sm,
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  genrePill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(53, 53, 52, 0.8)',
  },
  genrePillText: {
    fontSize: 10,
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.8,
    color: CINEMA.onSurfaceVariant,
  },
  yearText: {
    fontSize: 11,
    fontWeight: FontWeight.medium,
    color: CINEMA.onSurfaceVariant,
  },
  titleText: {
    fontSize: 32,
    fontWeight: FontWeight.heavy,
    letterSpacing: -0.5,
    lineHeight: 36,
    color: CINEMA.onSurface,
  },
  favoriteButton: {
    width: 48,
    height: 48,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(32, 31, 31, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    gap: Spacing.xl,
  },
  ratingCard: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.large,
    backgroundColor: CINEMA.surfaceContainerLow,
  },
  ratingLabel: {
    fontSize: 12,
    fontWeight: FontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: CINEMA.onSurfaceVariant,
  },
  section: {
    gap: Spacing.sm,
  },
  sectionHeading: {
    fontSize: 22,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.2,
    color: CINEMA.onSurface,
  },
  reviewCard: {
    borderRadius: Radius.large,
    backgroundColor: CINEMA.surfaceContainerHigh,
    overflow: 'hidden',
  },
  reviewInput: {
    minHeight: 110,
    padding: Spacing.md,
    fontSize: 17,
    lineHeight: 24,
    color: CINEMA.onSurface,
  },
  reviewFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: CINEMA.divider,
  },
  visibleText: {
    fontSize: 11,
    color: CINEMA.onSurfaceVariantDim,
  },
  postButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
    backgroundColor: CINEMA.primary,
  },
  postButtonText: {
    fontSize: 14,
    fontWeight: FontWeight.semibold,
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
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 6,
    borderRadius: Radius.pill,
    backgroundColor: CINEMA.primaryTint,
  },
  newEntryButtonText: {
    fontSize: 13,
    fontWeight: FontWeight.semibold,
    color: CINEMA.primary,
  },
  newEntryCard: {
    borderRadius: Radius.card,
    backgroundColor: CINEMA.surfaceContainerHigh,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: Spacing.xs,
  },
  newEntryInput: {
    minHeight: 60,
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
    fontWeight: FontWeight.medium,
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
    fontWeight: FontWeight.semibold,
    color: CINEMA.onPrimary,
  },
  emptyDiaryText: {
    fontSize: 14,
    lineHeight: 20,
    color: CINEMA.onSurfaceDim,
  },
  diaryEntryCard: {
    borderRadius: Radius.card,
    backgroundColor: CINEMA.surfaceContainerLow,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  diaryEntryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  diaryEntryLabel: {
    fontSize: 10,
    fontWeight: FontWeight.bold,
    letterSpacing: 1,
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
