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
import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { StarRatingControl } from '@/components/StarRatingControl';
import { PosterBackdrop } from '@/components/PosterBackdrop';
import { logWatch } from '@/db/logEntries';
import { setRating } from '@/db/movies';

interface QuickLogSheetProps {
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
  const { colors } = useTheme();
  
  // Format today's date as YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];
  const [dateWatched, setDateWatched] = useState(todayStr);
  const [rating, setRatingValue] = useState<number | null>(existingRating);
  const [review, setReview] = useState(existingReview ?? '');

  const handleSave = async () => {
    // Overwrite guard
    const hasExistingReview = !!existingReview;
    const reviewTrimmed = review.trim();
    const wouldOverwrite = hasExistingReview && reviewTrimmed !== (existingReview ?? '') && reviewTrimmed !== '';

    const executeSave = () => {
      // 1. Log the watch in LogEntry
      logWatch(tmdbId, dateWatched);
      
      // 2. Set/update rating and review on Movie row (forceOverwrite is true here since we passed the guard or confirmed)
      setRating(tmdbId, rating, reviewTrimmed || null, true);
      
      // 3. Play success haptic
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
    <PosterBackdrop posterPath={posterPath} dominantColor={dominantColor} blurIntensity={80}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.navButtonText, { color: colors.secondaryLabel }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.label }]} numberOfLines={1}>
              Log {title}
            </Text>
            <TouchableOpacity onPress={handleSave} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={[styles.navButtonText, { color: colors.accent, fontWeight: FontWeight.bold }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            {/* Watch Date Input */}
            <View style={[styles.section, { backgroundColor: colors.secondaryBackground + '80', borderColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryLabel }]}>Date Watched</Text>
              <TextInput
                style={[styles.dateInput, { color: colors.label }]}
                value={dateWatched}
                onChangeText={setDateWatched}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.secondaryLabel}
                maxLength={10}
              />
            </View>

            {/* Star Rating */}
            <View style={[styles.section, { backgroundColor: colors.secondaryBackground + '80', borderColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryLabel }]}>Rating</Text>
              <View style={styles.starsWrapper}>
                <StarRatingControl
                  value={rating}
                  onChange={(val) => setRatingValue(val)}
                  size={36}
                />
                {rating !== null && (
                  <TouchableOpacity onPress={() => setRatingValue(null)}>
                    <Text style={[styles.clearRating, { color: colors.secondaryLabel }]}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Review Box */}
            <View style={[styles.section, { backgroundColor: colors.secondaryBackground + '80', borderColor: colors.separator }]}>
              <Text style={[styles.label, { color: colors.secondaryLabel }]}>Review (Optional)</Text>
              <TextInput
                style={[styles.reviewInput, { color: colors.label }]}
                value={review}
                onChangeText={setReview}
                placeholder="What did you think of this movie?"
                placeholderTextColor={colors.secondaryLabel}
                multiline
                numberOfLines={6}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: FontSize.headline,
    fontWeight: FontWeight.semibold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: Spacing.sm,
  },
  navButtonText: {
    fontSize: FontSize.body,
  },
  scrollContent: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.md,
    borderRadius: Radius.medium,
    borderWidth: StyleSheet.hairlineWidth,
    // @ts-ignore
    borderCurve: 'continuous',
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateInput: {
    fontSize: FontSize.body,
    paddingVertical: Spacing.xs,
  },
  starsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  clearRating: {
    fontSize: FontSize.subheadline,
  },
  reviewInput: {
    fontSize: FontSize.body,
    minHeight: 120,
    paddingTop: Spacing.xs,
    lineHeight: 20,
  },
});
