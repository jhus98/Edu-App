import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFeedStore } from '../store/feedStore';
import { useAuthStore } from '../store/authStore';
import { CardView } from '../components/CardView';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORIES = [
  { key: null, label: 'All' },
  { key: 'HISTORY', label: '🏛️ History' },
  { key: 'SCIENCE', label: '🔬 Science' },
  { key: 'SPACE', label: '🚀 Space' },
  { key: 'NATURE', label: '🌿 Nature' },
  { key: 'GEOGRAPHY', label: '🌍 Geography' },
  { key: 'PHILOSOPHY', label: '🧠 Philosophy' },
  { key: 'TECHNOLOGY', label: '⚡ Technology' },
  { key: 'ART', label: '🎨 Art' },
];

export function FeedScreen() {
  const {
    cards,
    currentIndex,
    isLoading,
    isGenerating,
    selectedCategory,
    setCategory,
    loadFeed,
    goNext,
    goPrev,
    likeCard,
    saveCard,
    flagCard,
    generateCard,
  } = useFeedStore();

  const { user } = useAuthStore();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateCategory, setGenerateCategory] = useState('SCIENCE');

  useEffect(() => {
    loadFeed(true);
  }, []);

  const currentCard = cards[currentIndex];

  const handleGenerate = async () => {
    setShowGenerateModal(false);
    try {
      await generateCard(generateCategory);
    } catch {
      // Error handled in store
    }
  };

  if (isLoading && cards.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#60a5fa" />
        <Text style={styles.loadingText}>Loading Luminary...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <Text style={styles.appName}>✦ Luminary</Text>
        {user && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {user.streakCount}</Text>
          </View>
        )}
      </SafeAreaView>

      {/* Category pills */}
      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.key || 'all'}
              style={[
                styles.categoryPill,
                selectedCategory === cat.key && styles.categoryPillActive,
              ]}
              onPress={() => setCategory(cat.key)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat.key && styles.categoryPillTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Card feed */}
      {currentCard ? (
        <CardView
          card={currentCard}
          onLike={() => likeCard(currentCard.id)}
          onSave={() => saveCard(currentCard.id)}
          onFlag={(reason) => flagCard(currentCard.id, reason)}
          onNext={goNext}
          onPrev={goPrev}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptyText}>You've seen all cards in this category. Check back later or explore a different topic.</Text>
        </View>
      )}

      {/* Progress dots */}
      {cards.length > 0 && (
        <View style={styles.progressDots}>
          {cards.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, i) => {
            const realIndex = Math.max(0, currentIndex - 2) + i;
            return (
              <View
                key={realIndex}
                style={[
                  styles.dot,
                  realIndex === currentIndex && styles.dotActive,
                ]}
              />
            );
          })}
        </View>
      )}

      {/* AI Generate button */}
      {(user?.role === 'ADMIN' || user?.role === 'EDITOR') && (
        <TouchableOpacity
          style={styles.generateBtn}
          onPress={() => setShowGenerateModal(true)}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.generateBtnText}>✦</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Generate modal */}
      <Modal
        visible={showGenerateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGenerateModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setShowGenerateModal(false)}
          activeOpacity={1}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Generate New Fact</Text>
            <Text style={styles.modalSubtitle}>Choose a category for AI generation</Text>
            <ScrollView>
              {CATEGORIES.filter((c) => c.key).map((cat) => (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.modalOption,
                    generateCategory === cat.key && styles.modalOptionActive,
                  ]}
                  onPress={() => setGenerateCategory(cat.key!)}
                >
                  <Text style={styles.modalOptionText}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.generateConfirmBtn} onPress={handleGenerate}>
              <Text style={styles.generateConfirmText}>Generate ✦</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: 32 },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  appName: { fontSize: 20, fontWeight: '800', color: '#ffffff', letterSpacing: 1 },
  streakBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  streakText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  categoryContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  categoryScroll: { paddingHorizontal: 16, gap: 8 },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  categoryPillActive: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  categoryPillText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },
  categoryPillTextActive: { color: '#000000' },
  loadingText: { color: 'rgba(255,255,255,0.5)', marginTop: 16 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 20 },
  progressDots: {
    position: 'absolute',
    right: 12,
    top: '50%',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  dotActive: { backgroundColor: '#ffffff', height: 12 },
  generateBtn: {
    position: 'absolute',
    bottom: 120,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  generateBtnText: { fontSize: 22, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 20 },
  modalOption: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  modalOptionActive: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  modalOptionText: { color: '#fff', fontSize: 15 },
  generateConfirmBtn: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  generateConfirmText: { color: '#000', fontWeight: '700', fontSize: 16 },
});
