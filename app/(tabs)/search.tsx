import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { GenreTile } from '@/components/GenreTile';
import { PosterGridCell } from '@/components/PosterGridCell';
import { ErrorState } from '@/components/ErrorState';
import { useTheme } from '@/context/ThemeContext';
import { FontSize, Radius, Spacing } from '@/constants/tokens';
import {
  discoverByGenre,
  getGenres,
  searchMovies,
  type TmdbGenre,
  type TmdbMovie,
} from '@/services/tmdb';

type Mode = 'idle' | 'genre' | 'search';

export default function SearchScreen() {
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<Mode>('idle');
  const [genres, setGenres] = useState<TmdbGenre[]>([]);
  const [results, setResults] = useState<TmdbMovie[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getGenres()
      .then(setGenres)
      .catch((err) => {
        console.error('Error fetching genres:', err);
      });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setMode('idle');
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setMode('search');
      setLoading(true);
      setError(false);
      try {
        const res = await searchMovies(query.trim());
        setResults(res);
      } catch (err) {
        console.error(err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }, 400);
  }, [query]);

  async function handleGenreTap(genre: TmdbGenre) {
    setMode('genre');
    setQuery('');
    setLoading(true);
    setError(false);
    try {
      const res = await discoverByGenre(genre.id);
      setResults(res);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setQuery('');
    setMode('idle');
    setResults([]);
    setError(false);
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Search bar */}
      <View
        style={[
          styles.searchBar,
          { backgroundColor: colors.secondaryBackground, borderColor: colors.separator },
        ]}
      >
        <Text style={[styles.searchIcon, { color: colors.secondaryLabel }]}>🔍</Text>
        <TextInput
          style={[styles.input, { color: colors.label }]}
          placeholder="Search movies..."
          placeholderTextColor={colors.secondaryLabel}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Clear search"
          >
            <Text style={[styles.clearIcon, { color: colors.secondaryLabel }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : error ? (
        <ErrorState
          body="Could not load results. Check your connection."
          onRetry={handleClear}
        />
      ) : mode === 'idle' ? (
        <FlashList
          data={genres}
          numColumns={2}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={80}
          contentContainerStyle={{ padding: Spacing.md, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          renderItem={({ item, index }) => (
            <GenreTile
              name={item.name}
              index={index}
              onPress={() => handleGenreTap(item)}
              style={{ flex: 1, marginHorizontal: Spacing.xs / 2 }}
            />
          )}
        />
      ) : (
        <FlashList
          data={results}
          numColumns={3}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={165}
          contentContainerStyle={{ padding: Spacing.sm, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
          renderItem={({ item }) => (
            <PosterGridCell
              tmdbId={item.id}
              title={item.title}
              posterPath={item.poster_path}
              releaseYear={
                item.release_date ? parseInt(item.release_date.slice(0, 4), 10) : null
              }
              onPress={() => router.push(`/movie/${item.id}`)}
              style={{ marginHorizontal: Spacing.xs / 2 }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.small,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.xs,
  },
  searchIcon: { fontSize: 16 },
  input: {
    flex: 1,
    fontSize: FontSize.body,
    paddingVertical: 0,
  },
  clearIcon: { fontSize: 14 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
