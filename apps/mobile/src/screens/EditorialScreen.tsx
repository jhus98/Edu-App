import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../utils/api';

interface VerificationLog {
  checkType: string;
  passed: boolean;
  details: Record<string, unknown>;
}

interface Card {
  id: string;
  title: string;
  body: string;
  sourceTitle: string;
  sourceUrl: string;
  category: string;
  confidenceScore: number;
  status: string;
  createdAt: string;
  verifications: VerificationLog[];
}

export function EditorialScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [editFields, setEditFields] = useState({ title: '', body: '', sourceTitle: '', sourceUrl: '', reason: '' });

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/editorial/pending');
      setCards(data);
    } catch {
      Alert.alert('Error', 'Failed to load pending cards');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (cardId: string) => {
    try {
      await api.post(`/api/editorial/cards/${cardId}/approve`);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
    } catch {
      Alert.alert('Error', 'Failed to approve card');
    }
  };

  const handleReject = (cardId: string) => {
    Alert.prompt('Reject Card', 'Enter rejection reason:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async (reason) => {
          if (!reason) return;
          try {
            await api.post(`/api/editorial/cards/${cardId}/reject`, { reason });
            setCards((prev) => prev.filter((c) => c.id !== cardId));
          } catch {
            Alert.alert('Error', 'Failed to reject card');
          }
        },
      },
    ]);
  };

  const startEdit = (card: Card) => {
    setEditingCard(card);
    setEditFields({
      title: card.title,
      body: card.body,
      sourceTitle: card.sourceTitle,
      sourceUrl: card.sourceUrl,
      reason: '',
    });
  };

  const handleUpdate = async () => {
    if (!editingCard || !editFields.reason) {
      Alert.alert('Error', 'Reason for edit is required');
      return;
    }

    try {
      await api.patch(`/api/editorial/cards/${editingCard.id}`, editFields);
      setCards((prev) => prev.filter((c) => c.id !== editingCard.id));
      setEditingCard(null);
    } catch {
      Alert.alert('Error', 'Failed to update card');
    }
  };

  if (editingCard) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView>
          <View style={styles.editHeader}>
            <TouchableOpacity onPress={() => setEditingCard(null)}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.editTitle}>Edit Card</Text>
          </View>

          <View style={styles.editForm}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={editFields.title}
              onChangeText={(t) => setEditFields((f) => ({ ...f, title: t }))}
              multiline
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.fieldLabel}>Body</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editFields.body}
              onChangeText={(t) => setEditFields((f) => ({ ...f, body: t }))}
              multiline
              numberOfLines={4}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.fieldLabel}>Source Title</Text>
            <TextInput
              style={styles.input}
              value={editFields.sourceTitle}
              onChangeText={(t) => setEditFields((f) => ({ ...f, sourceTitle: t }))}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.fieldLabel}>Source URL</Text>
            <TextInput
              style={styles.input}
              value={editFields.sourceUrl}
              onChangeText={(t) => setEditFields((f) => ({ ...f, sourceUrl: t }))}
              autoCapitalize="none"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <Text style={styles.fieldLabel}>Reason for edit *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={editFields.reason}
              onChangeText={(t) => setEditFields((f) => ({ ...f, reason: t }))}
              placeholder="Why are you making this change?"
              multiline
              numberOfLines={2}
              placeholderTextColor="rgba(255,255,255,0.3)"
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdate}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Editorial Queue</Text>
        <Text style={styles.subtitle}>{cards.length} card{cards.length !== 1 ? 's' : ''} pending</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#60a5fa" />
        </View>
      ) : cards.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Queue empty</Text>
          <Text style={styles.emptyText}>All cards have been reviewed</Text>
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardMeta}>
                <Text style={styles.cardCategory}>{item.category}</Text>
                <View style={[styles.scoreChip, item.confidenceScore >= 80 ? styles.scoreHigh : styles.scoreLow]}>
                  <Text style={styles.scoreText}>{item.confidenceScore}%</Text>
                </View>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
              <Text style={styles.cardSource}>📎 {item.sourceTitle}</Text>

              <View style={styles.checks}>
                {item.verifications?.map((v) => (
                  <View key={v.checkType} style={styles.checkRow}>
                    <Text style={[styles.checkIcon, v.passed ? styles.checkPass : styles.checkFail]}>
                      {v.passed ? '✓' : '✗'}
                    </Text>
                    <Text style={styles.checkType}>{v.checkType.replace('_', ' ')}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.approveBtn]}
                  onPress={() => handleApprove(item.id)}
                >
                  <Text style={styles.actionBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn]}
                  onPress={() => startEdit(item)}
                >
                  <Text style={styles.actionBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() => handleReject(item.id)}
                >
                  <Text style={styles.actionBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardCategory: { fontSize: 10, color: '#60a5fa', fontWeight: '700', textTransform: 'uppercase' },
  scoreChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  scoreHigh: { backgroundColor: 'rgba(52,211,153,0.2)' },
  scoreLow: { backgroundColor: 'rgba(251,146,60,0.2)' },
  scoreText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 6 },
  cardBody: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19, marginBottom: 8 },
  cardSource: { fontSize: 10, fontStyle: 'italic', color: 'rgba(255,255,255,0.3)', marginBottom: 12 },
  checks: { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  checkIcon: { fontSize: 13, fontWeight: '700' },
  checkPass: { color: '#34d399' },
  checkFail: { color: '#ef4444' },
  checkType: { fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, padding: 10, borderRadius: 10, alignItems: 'center' },
  approveBtn: { backgroundColor: 'rgba(52,211,153,0.15)', borderWidth: 1, borderColor: '#34d399' },
  editBtn: { backgroundColor: 'rgba(96,165,250,0.15)', borderWidth: 1, borderColor: '#60a5fa' },
  rejectBtn: { backgroundColor: 'rgba(239,68,68,0.15)', borderWidth: 1, borderColor: '#ef4444' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  editHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 16, gap: 16 },
  backBtn: { color: '#60a5fa', fontSize: 16 },
  editTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  editForm: { paddingHorizontal: 20 },
  fieldLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#60a5fa', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 24, marginBottom: 40 },
  saveBtnText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
