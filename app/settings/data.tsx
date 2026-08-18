import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { useTheme } from '@/context/ThemeContext';
import { FontSize, FontWeight, Radius, Spacing } from '@/constants/tokens';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import {
  importLetterboxdData,
  serializeBackup,
  parseBackupDocument,
  restoreBackup,
  type ImportSummary,
  type RestoreSummary,
} from '@/services/dataPortability';

const CSV_MIME_TYPES = ['text/csv', 'text/comma-separated-values', 'text/plain', 'public.comma-separated-values-text'];

interface PickedFile {
  name: string;
  text: string;
}

export default function DataPortabilityScreen() {
  const { colors, colorScheme } = useTheme();

  const cardBg = colorScheme === 'dark' ? '#201F1F' : 'rgba(255, 255, 255, 0.90)';
  const cardBorder = colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  // ─── Import state ───────────────────────────────────────────────────
  const [diaryFile, setDiaryFile] = useState<PickedFile | null>(null);
  const [ratingsFile, setRatingsFile] = useState<PickedFile | null>(null);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ processed: number; total: number } | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [showUnmatched, setShowUnmatched] = useState(false);

  // ─── Backup/restore state ───────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(null);

  async function pickCsv(onPicked: (file: PickedFile) => void) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: CSV_MIME_TYPES,
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const file = new File(asset.uri);
      const text = await file.text();
      onPicked({ name: asset.name, text });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      Alert.alert('Could not read file', err instanceof Error ? err.message : 'Unknown error.');
    }
  }

  async function handleStartImport() {
    if (!diaryFile && !ratingsFile) return;
    setImporting(true);
    setImportSummary(null);
    setImportProgress(null);
    try {
      const summary = await importLetterboxdData(
        diaryFile?.text ?? null,
        ratingsFile?.text ?? null,
        (processed, total) => setImportProgress({ processed, total }),
      );
      setImportSummary(summary);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  }

  async function handleExportBackup() {
    setExporting(true);
    try {
      const json = serializeBackup();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File(Paths.cache, `media-centre-backup-${timestamp}.json`);
      if (file.exists) file.delete();
      file.create();
      file.write(json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Save Media Centre Backup',
        });
      } else {
        Alert.alert('Backup saved', `Saved to ${file.uri}`);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      Alert.alert('Backup failed', err instanceof Error ? err.message : 'Unknown error.');
    } finally {
      setExporting(false);
    }
  }

  async function handleRestoreBackup() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const file = new File(result.assets[0].uri);
      const text = await file.text();
      const doc = parseBackupDocument(text);

      Alert.alert(
        'Restore backup?',
        'This will merge the backup into your current local data. Existing entries are not deleted.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            style: 'destructive',
            onPress: () => {
              setRestoring(true);
              setRestoreSummary(null);
              try {
                const summary = restoreBackup(doc);
                setRestoreSummary(summary);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              } catch (err) {
                Alert.alert('Restore failed', err instanceof Error ? err.message : 'Unknown error.');
              } finally {
                setRestoring(false);
              }
            },
          },
        ],
      );
    } catch (err) {
      Alert.alert('Could not read backup file', err instanceof Error ? err.message : 'Invalid JSON.');
    }
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <Stack.Screen options={{ headerShown: true, headerTitle: 'Data', headerBackTitle: 'Back' }} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ─── Import from Letterboxd ─────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>Import from Letterboxd</Text>
          <Text style={[styles.sectionBody, { color: colors.secondaryLabel }]}>
            Export your data from Letterboxd (Settings → Import & Export), unzip it, then pick the diary.csv
            and/or ratings.csv files here.
          </Text>

          <View style={[styles.groupedCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <PickerRow
              icon="book.closed"
              label="Diary (diary.csv)"
              fileName={diaryFile?.name ?? null}
              onPress={() => pickCsv(setDiaryFile)}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: cardBorder }]} />
            <PickerRow
              icon="star"
              label="Ratings (ratings.csv)"
              fileName={ratingsFile?.name ?? null}
              onPress={() => pickCsv(setRatingsFile)}
              colors={colors}
            />
          </View>

          <AnimatedPressable
            style={[
              styles.primaryButton,
              {
                backgroundColor: diaryFile || ratingsFile ? colors.accent : colors.searchBarBackground,
                opacity: importing ? 0.7 : 1,
              },
            ]}
            onPress={handleStartImport}
            disabled={importing || (!diaryFile && !ratingsFile)}
            accessibilityLabel="Start import"
          >
            <View style={styles.primaryButtonInner}>
              {importing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <SymbolView name="square.and.arrow.down" size={16} tintColor="#FFFFFF" weight="bold" />
              )}
              <Text style={styles.primaryButtonText}>
                {importing
                  ? importProgress
                    ? `Importing ${importProgress.processed}/${importProgress.total}…`
                    : 'Importing…'
                  : 'Start Import'}
              </Text>
            </View>
          </AnimatedPressable>

          {importSummary ? (
            <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.resultTitle, { color: colors.label }]}>
                {importSummary.matched} of {importSummary.totalUniqueTitles} titles imported
              </Text>
              <Text style={[styles.resultBody, { color: colors.secondaryLabel }]}>
                {importSummary.logEntriesImported} diary {importSummary.logEntriesImported === 1 ? 'entry' : 'entries'},{' '}
                {importSummary.ratingsImported} {importSummary.ratingsImported === 1 ? 'rating' : 'ratings'} applied.
              </Text>
              {importSummary.unmatched.length > 0 ? (
                <>
                  <Text style={[styles.resultBody, { color: colors.secondaryLabel, marginTop: Spacing.xs }]}>
                    {importSummary.unmatched.length} couldn't be matched.
                  </Text>
                  <AnimatedPressable
                    style={styles.linkButton}
                    onPress={() => setShowUnmatched((v) => !v)}
                    haptic={false}
                    accessibilityLabel="Toggle unmatched titles list"
                  >
                    <Text style={[styles.linkButtonText, { color: colors.accent }]}>
                      {showUnmatched ? 'Hide list' : 'Show list'}
                    </Text>
                  </AnimatedPressable>
                  {showUnmatched ? (
                    <View style={{ gap: 2, marginTop: Spacing.xs }}>
                      {importSummary.unmatched.map((u, idx) => (
                        <Text
                          key={`${u.title}-${u.year}-${idx}`}
                          style={[styles.unmatchedRow, { color: colors.tertiaryLabel }]}
                        >
                          {u.title}
                          {u.year ? ` (${u.year})` : ''}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* ─── Backup & Restore ───────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionHeading, { color: colors.secondaryLabel }]}>Backup & Restore</Text>
          <Text style={[styles.sectionBody, { color: colors.secondaryLabel }]}>
            There's no cloud backend — your movies, diary, watchlist, and likes only live on this device.
            Export a JSON backup periodically, or restore one onto a new device.
          </Text>

          <View style={[styles.groupedCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <ActionRow
              icon="square.and.arrow.up"
              iconColor="#A7C8FF"
              label="Export Backup"
              sub="Save all local data as JSON"
              loading={exporting}
              onPress={handleExportBackup}
              colors={colors}
            />
            <View style={[styles.divider, { backgroundColor: cardBorder }]} />
            <ActionRow
              icon="tray.and.arrow.down"
              iconColor="#FFB4AA"
              label="Restore from Backup"
              sub="Pick a previously-saved backup file"
              loading={restoring}
              onPress={handleRestoreBackup}
              colors={colors}
            />
          </View>

          {restoreSummary ? (
            <View style={[styles.resultCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
              <Text style={[styles.resultTitle, { color: colors.label }]}>Restore complete</Text>
              <Text style={[styles.resultBody, { color: colors.secondaryLabel }]}>
                {restoreSummary.moviesRestored} movies · {restoreSummary.logEntriesRestored} diary entries
                {restoreSummary.logEntriesSkippedDuplicate > 0
                  ? ` (${restoreSummary.logEntriesSkippedDuplicate} already logged)`
                  : ''}{' '}
                · {restoreSummary.watchlistRestored} watchlist · {restoreSummary.likesRestored} liked
              </Text>
              {restoreSummary.errors.length > 0 ? (
                <Text style={[styles.resultBody, { color: colors.accent, marginTop: Spacing.xs }]}>
                  {restoreSummary.errors.length} row(s) skipped due to invalid data.
                </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Row components ─────────────────────────────────────────────────

function PickerRow({
  icon,
  label,
  fileName,
  onPress,
  colors,
}: {
  icon: string;
  label: string;
  fileName: string | null;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <AnimatedPressable style={styles.row} onPress={onPress} haptic={false} accessibilityLabel={label}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBadge, { backgroundColor: '#353534' }]}>
          <SymbolView name={icon as any} size={17} tintColor="#E5E2E1" weight="medium" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.label }]}>{label}</Text>
          <Text style={[styles.rowSub, { color: fileName ? colors.accent : colors.secondaryLabel }]} numberOfLines={1}>
            {fileName ?? 'Not selected'}
          </Text>
        </View>
      </View>
      <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} weight="semibold" />
    </AnimatedPressable>
  );
}

function ActionRow({
  icon,
  iconColor,
  label,
  sub,
  loading,
  onPress,
  colors,
}: {
  icon: string;
  iconColor: string;
  label: string;
  sub: string;
  loading: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <AnimatedPressable style={styles.row} onPress={onPress} disabled={loading} accessibilityLabel={label}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconBadge, { backgroundColor: '#353534' }]}>
          <SymbolView name={icon as any} size={17} tintColor={iconColor} weight="medium" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowTitle, { color: colors.label }]}>{label}</Text>
          <Text style={[styles.rowSub, { color: colors.secondaryLabel }]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <SymbolView name="chevron.right" size={14} tintColor={colors.secondaryLabel} weight="semibold" />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  section: {
    paddingHorizontal: Spacing.md,
    marginTop: Spacing.lg,
  },
  sectionHeading: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
    letterSpacing: -0.1,
    marginBottom: Spacing.xs,
    paddingHorizontal: 2,
  },
  sectionBody: {
    fontSize: FontSize.footnote,
    lineHeight: 18,
    marginBottom: Spacing.sm,
    paddingHorizontal: 2,
  },
  groupedCard: {
    borderRadius: Radius.card,
    borderWidth: 1,
    overflow: 'hidden',
    // @ts-ignore
    borderCurve: 'continuous',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    gap: Spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.semibold,
  },
  rowSub: {
    fontSize: FontSize.caption1,
    fontWeight: FontWeight.medium,
    marginTop: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  primaryButton: {
    marginTop: Spacing.sm,
    borderRadius: Radius.pill,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  primaryButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
    paddingVertical: Spacing.sm + 4,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
  resultCard: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.card,
    borderWidth: 1,
    gap: 2,
    // @ts-ignore
    borderCurve: 'continuous',
  },
  resultTitle: {
    fontSize: FontSize.subheadline,
    fontWeight: FontWeight.bold,
  },
  resultBody: {
    fontSize: FontSize.footnote,
    lineHeight: 18,
  },
  linkButton: {
    marginTop: Spacing.xs,
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    fontSize: FontSize.footnote,
    fontWeight: FontWeight.semibold,
  },
  unmatchedRow: {
    fontSize: FontSize.caption1,
  },
});
