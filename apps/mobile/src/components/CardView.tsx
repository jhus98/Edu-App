import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Alert,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_CONFIG: Record<string, { gradientStart: string; gradientEnd: string; accent: string; label: string; emoji: string }> = {
  HISTORY:    { gradientStart: '#1a0800', gradientEnd: '#6b2200', accent: '#fb923c', label: 'History',    emoji: '🏛️' },
  SCIENCE:    { gradientStart: '#001408', gradientEnd: '#005028', accent: '#34d399', label: 'Science',    emoji: '🔬' },
  SPACE:      { gradientStart: '#00040f', gradientEnd: '#001060', accent: '#60a5fa', label: 'Space',      emoji: '🚀' },
  NATURE:     { gradientStart: '#060f00', gradientEnd: '#213d00', accent: '#a3e635', label: 'Nature',     emoji: '🌿' },
  GEOGRAPHY:  { gradientStart: '#160010', gradientEnd: '#560038', accent: '#f472b6', label: 'Geography',  emoji: '🌍' },
  PHILOSOPHY: { gradientStart: '#08001a', gradientEnd: '#2d0070', accent: '#c084fc', label: 'Philosophy', emoji: '🧠' },
  TECHNOLOGY: { gradientStart: '#001018', gradientEnd: '#003d5c', accent: '#38bdf8', label: 'Technology', emoji: '⚡' },
  ART:        { gradientStart: '#1a0010', gradientEnd: '#5c0038', accent: '#f9a8d4', label: 'Art',        emoji: '🎨' },
};

interface Card {
  id: string;
  title: string;
  body: string;
  sourceTitle: string;
  sourceUrl: string;
  category: string;
  liked?: boolean;
  saved?: boolean;
}

interface CardViewProps {
  card: Card;
  onLike: () => void;
  onSave: () => void;
  onFlag: (reason: string) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function CardView({ card, onLike, onSave, onFlag, onNext, onPrev }: CardViewProps) {
  const config = CATEGORY_CONFIG[card.category] || CATEGORY_CONFIG.SCIENCE;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${card.title}\n\n${card.body}\n\nSource: ${card.sourceUrl}\n\nShared from Luminary`,
        title: card.title,
      });
    } catch {
      // Share dismissed
    }
  };

  const handleFlag = () => {
    Alert.alert('Report Fact', 'Why are you reporting this?', [
      { text: 'Inaccurate', onPress: () => onFlag('Inaccurate information') },
      { text: 'Misleading', onPress: () => onFlag('Misleading framing') },
      { text: 'Inappropriate', onPress: () => onFlag('Inappropriate content') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <LinearGradient
      colors={[config.gradientStart, config.gradientEnd]}
      style={styles.card}
    >
      <View style={styles.categoryBadge}>
        <Text style={[styles.categoryEmoji]}>{config.emoji}</Text>
        <Text style={[styles.categoryLabel, { color: config.accent }]}>{config.label}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{card.title}</Text>
        <Text style={styles.body}>{card.body}</Text>
        <Text style={styles.source}>📎 {card.sourceTitle || card.sourceUrl}</Text>
      </View>

      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionBtn} onPress={onPrev}>
          <Text style={styles.actionIcon}>←</Text>
          <Text style={styles.actionLabel}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onLike}>
          <Text style={[styles.actionIcon, card.liked && { color: '#ef4444' }]}>
            {card.liked ? '❤️' : '🤍'}
          </Text>
          <Text style={styles.actionLabel}>Like</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onNext}>
          <Text style={styles.actionIcon}>→</Text>
          <Text style={styles.actionLabel}>Next</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onSave}>
          <Text style={[styles.actionIcon, card.saved && { color: '#fbbf24' }]}>
            {card.saved ? '🔖' : '📌'}
          </Text>
          <Text style={styles.actionLabel}>Save</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={styles.actionLabel}>Share</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleFlag}>
          <Text style={styles.actionIcon}>⚑</Text>
          <Text style={styles.actionLabel}>Report</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'flex-end',
    paddingBottom: 100,
  },
  categoryBadge: {
    position: 'absolute',
    top: 60,
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  categoryEmoji: {
    fontSize: 14,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingTop: 24,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
    lineHeight: 30,
  },
  body: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 22,
    marginBottom: 12,
  },
  source: {
    fontSize: 11,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.5)',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  actionBtn: {
    alignItems: 'center',
    padding: 8,
    minWidth: 48,
  },
  actionIcon: {
    fontSize: 20,
    color: '#ffffff',
    marginBottom: 2,
  },
  actionLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
