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
import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { StarRatingControl } from '@/components/StarRatingControl';
import { PosterBackdrop } from '@/components/PosterBackdrop';
import { logWatch } from '@/db/logEntries';
import { setRating } from '@/db/movies';

export interface QuickLogSheetProps {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  dominantColor?: string | null;
  existingRating: number | null;
  existingReview: string | null;
  onSave: () => void;
  onDismiss: () => void;
}

export function QuickLogSheet({
  tmdbId,
  title,
  posterPath,
  dominantColor,
  existingRating,
  existingReview,
  onSave,
  onDismiss,
}: QuickLogSheetProps) {
  const { colors, colorScheme } = useTheme();

  // Format today's date as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateWatched, setDateWatched] = useState(todayStr);
  const [rating, setRatingValue] = useState<number | null>(existingRating);
  const [review, setReview] = useState(existingReview ?? '');

  const handleSave = async () => {
    const hasExistingReview = !!existingReview;
    const reviewTrimmed = review.trim();
    const wouldOverwrite =
      hasExistingReview &&
      reviewTrimmed !== (existingReview ?? '') &&
      reviewTrimmed !== '';

    const executeSave = () => {
      logWatch(tmdbId, 'movie', dateWatched);
      setRating(tmdbId, rating, reviewTrimmed || null, true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSave();
    };

    if (wouldOverwrite) {
      Alert.alert(
        'Overwrite Existing Review?',
        'You already have a saved review for this movie. Saving this will overwrite your previous review text app-wide.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Overwrite', style: 'destructive', onPress: executeSave },
        ]
      );
    } else {
      executeSave();
    }
  };

  return (
    <PosterBackdrop posterPath={posterPath} dominantColor={dominantColor} blurIntensity={95}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* iOS Grabber */}
          <View style={styles.grabberContainer}>
            <View style={[styles.grabber, { backgroundColor: colors.quaternaryLabel }]} />
          </View>

          {/* Navigation Bar */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onDismiss}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={[styles.cancelText, { color: colors.secondaryLabel }]}>Cancel</Text>
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={[styles.headerTitle, { color: colors.label }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.secondaryLabel }]}>
                Log Entry
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSave}
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.accent,
                  shadowColor: colors.accent,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.45,
                  shadowRadius: 10,
                  elevation: 6,
                },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Watch Date Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(32, 31, 31, 0.85)'
                      : 'rgba(255, 255, 255, 0.88)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: 1,
                  ...colors.cardShadow,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <SymbolView name="calendar" size={16} tintColor={colors.accent} weight="semibold" />
                <Text style={[styles.cardLabel, { color: colors.secondaryLabel }]}>
                  DATE WATCHED
                </Text>
              </View>
              <TextInput
                style={[styles.dateInput, { color: colors.label }]}
                value={dateWatched}
                onChangeText={setDateWatched}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.secondaryLabel}
                maxLength={10}
              />
            </View>

            {/* Star Rating Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(32, 31, 31, 0.85)'
                      : 'rgba(255, 255, 255, 0.88)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: 1,
                  ...colors.cardShadow,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <SymbolView name="star.fill" size={16} tintColor={colors.starGold ?? '#FFD60A'} weight="semibold" />
                <Text style={[styles.cardLabel, { color: colors.secondaryLabel }]}>
                  YOUR RATING
                </Text>
              </View>
              <View style={styles.starsRow}>
                <StarRatingControl
                  value={rating}
                  onChange={(val) => setRatingValue(val)}
                  size={36}
                />
                {rating !== null && (
                  <TouchableOpacity
                    onPress={() => setRatingValue(null)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={[styles.clearRatingText, { color: colors.secondaryLabel }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Review Card */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor:
                    colorScheme === 'dark'
                      ? 'rgba(32, 31, 31, 0.85)'
                      : 'rgba(255, 255, 255, 0.88)',
                  borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)',
                  borderWidth: 1,
                  ...colors.cardShadow,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <SymbolView name="square.and.pencil" size={16} tintColor={colors.accent} weight="semibold" />
                <Text style={[styles.cardLabel, { color: colors.secondaryLabel }]}>
                  REVIEW & NOTES (OPTIONAL)
                </Text>
              </View>
              <TextInput
                style={[styles.reviewInput, { color: colors.label }]}
                value={review}
                onChangeText={setReview}
                placeholder="What did you think of this film?"
                placeholderTextColor={colors.secondaryLabel}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </PosterBackdrop>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  grabberContainer: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.medium,
  },
  cancelText: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.regular,
  },
  saveButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.pill,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 40,
  },
  card: {
    padding: Spacing.md,
    borderRadius: Radius.card,
    gap: Spacing.sm,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs + 2,
  },
  cardLabel: {
    fontSize: FontSize.caption2,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.6,
  },
  dateInput: {
    fontSize: FontSize.body,
    fontWeight: FontWeight.medium,
    paddingVertical: Spacing.xs,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  clearRatingText: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.medium,
  },
  reviewInput: {
    fontSize: FontSize.body,
    minHeight: 100,
    paddingTop: Spacing.xs,
    lineHeight: 22,
  },
});
