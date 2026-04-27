import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../utils/api';

interface Card {
  id: string;
  title: string;
  body: string;
  category: string;
  sourceTitle: string;
}

const CATEGORY_ACCENT: Record<string, string> = {
  HISTORY: '#fb923c', SCIENCE: '#34d399', SPACE: '#60a5fa', NATURE: '#a3e635',
  GEOGRAPHY: '#f472b6', PHILOSOPHY: '#c084fc', TECHNOLOGY: '#38bdf8', ART: '#f9a8d4',
};

export function SavedScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    try {
      const { data } = await api.get('/api/users/me/saved');
      setCards(data);
    } catch (err) {
      console.error('[SavedScreen]', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
      </View>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.header}>Saved</Text>
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📌</Text>
          <Text style={styles.emptyTitle}>Nothing saved yet</Text>
          <Text style={styles.emptyText}>Save facts to build your collection</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Saved</Text>
      <Text style={styles.subheader}>{cards.length} fact{cards.length !== 1 ? 's' : ''} saved</Text>
      <FlatList
        data={cards}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.8}>
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.categoryDot,
                  { backgroundColor: CATEGORY_ACCENT[item.category] || '#ffffff' },
                ]}
              />
              <Text style={[styles.categoryText, { color: CATEGORY_ACCENT[item.category] || '#fff' }]}>
                {item.category}
              </Text>
            </View>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
            <Text style={styles.cardSource}>📎 {item.sourceTitle}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: { fontSize: 28, fontWeight: '800', color: '#fff', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  subheader: { fontSize: 13, color: 'rgba(255,255,255,0.4)', paddingHorizontal: 20, marginBottom: 16 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  categoryText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6, lineHeight: 22 },
  cardBody: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19, marginBottom: 8 },
  cardSource: { fontSize: 10, fontStyle: 'italic', color: 'rgba(255,255,255,0.3)' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center' },
});
