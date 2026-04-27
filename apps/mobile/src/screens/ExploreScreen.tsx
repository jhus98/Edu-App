import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFeedStore } from '../store/feedStore';
import api from '../utils/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TILE_SIZE = (SCREEN_WIDTH - 48) / 2;

const CATEGORY_CONFIG = [
  { key: 'HISTORY',    label: 'History',    emoji: '🏛️', start: '#1a0800', end: '#6b2200', accent: '#fb923c' },
  { key: 'SCIENCE',    label: 'Science',    emoji: '🔬', start: '#001408', end: '#005028', accent: '#34d399' },
  { key: 'SPACE',      label: 'Space',      emoji: '🚀', start: '#00040f', end: '#001060', accent: '#60a5fa' },
  { key: 'NATURE',     label: 'Nature',     emoji: '🌿', start: '#060f00', end: '#213d00', accent: '#a3e635' },
  { key: 'GEOGRAPHY',  label: 'Geography',  emoji: '🌍', start: '#160010', end: '#560038', accent: '#f472b6' },
  { key: 'PHILOSOPHY', label: 'Philosophy', emoji: '🧠', start: '#08001a', end: '#2d0070', accent: '#c084fc' },
  { key: 'TECHNOLOGY', label: 'Technology', emoji: '⚡', start: '#001018', end: '#003d5c', accent: '#38bdf8' },
  { key: 'ART',        label: 'Art',        emoji: '🎨', start: '#1a0010', end: '#5c0038', accent: '#f9a8d4' },
];

interface SearchResult {
  id: string;
  title: string;
  category: string;
  body: string;
}

export function ExploreScreen({ navigation }: any) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const { setCategory } = useFeedStore();

  useEffect(() => {
    loadTrending();
  }, []);

  const loadTrending = async () => {
    try {
      const { data } = await api.get('/api/feed', { params: { limit: '5' } });
      setTrending(data.cards || []);
    } catch {
      // Network unavailable
    }
  };

  const handleSearch = async (text: string) => {
    setQuery(text);
    if (text.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await api.get('/api/admin/search', { params: { q: text } });
      setResults(data || []);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCategoryPress = (key: string) => {
    setCategory(key);
    navigation?.navigate('Feed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.header}>Explore</Text>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search facts..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
          {isSearching && (
            <ActivityIndicator style={styles.searchSpinner} size="small" color="#60a5fa" />
          )}
        </View>

        {query.length >= 2 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Search Results</Text>
            {results.length === 0 && !isSearching ? (
              <Text style={styles.emptyText}>No results for "{query}"</Text>
            ) : (
              results.map((item) => (
                <View key={item.id} style={styles.resultCard}>
                  <Text style={styles.resultTitle}>{item.title}</Text>
                  <Text style={styles.resultBody} numberOfLines={2}>{item.body}</Text>
                  <Text style={styles.resultCategory}>{item.category}</Text>
                </View>
              ))
            )}
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle} style={{ paddingHorizontal: 20, marginBottom: 12 }}>Categories</Text>
            <View style={styles.grid}>
              {CATEGORY_CONFIG.map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  onPress={() => handleCategoryPress(cat.key)}
                  style={styles.tile}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[cat.start, cat.end]}
                    style={styles.tileGradient}
                  >
                    <Text style={styles.tileEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.tileLabel, { color: cat.accent }]}>{cat.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>

            {trending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending This Week</Text>
                {trending.map((card) => (
                  <TouchableOpacity
                    key={card.id}
                    style={styles.trendingCard}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.trendingTitle}>{card.title}</Text>
                    <Text style={styles.trendingCategory}>{card.category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { fontSize: 28, fontWeight: '800', color: '#fff', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  searchContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 15, paddingVertical: 14 },
  searchSpinner: { marginLeft: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16, marginBottom: 32 },
  tile: { width: TILE_SIZE, height: TILE_SIZE * 0.7, borderRadius: 16, overflow: 'hidden' },
  tileGradient: { flex: 1, justifyContent: 'flex-end', padding: 14 },
  tileEmoji: { fontSize: 28, marginBottom: 4 },
  tileLabel: { fontSize: 14, fontWeight: '700' },
  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 12 },
  resultCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  resultTitle: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 4 },
  resultBody: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 6 },
  resultCategory: { fontSize: 10, color: '#60a5fa', textTransform: 'uppercase', fontWeight: '600' },
  trendingCard: {
    backgroundColor: '#111',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendingTitle: { flex: 1, fontSize: 14, color: '#fff', fontWeight: '500' },
  trendingCategory: { fontSize: 10, color: '#60a5fa', fontWeight: '600', textTransform: 'uppercase' },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
});
