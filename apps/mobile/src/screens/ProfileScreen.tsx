import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import api from '../utils/api';

interface Stats {
  seen: number;
  liked: number;
  saved: number;
  categoryBreakdown: { category: string; count: number }[];
}

const CATEGORY_ACCENT: Record<string, string> = {
  HISTORY: '#fb923c', SCIENCE: '#34d399', SPACE: '#60a5fa', NATURE: '#a3e635',
  GEOGRAPHY: '#f472b6', PHILOSOPHY: '#c084fc', TECHNOLOGY: '#38bdf8', ART: '#f9a8d4',
};

export function ProfileScreen() {
  const { user, logout, loadStoredAuth } = useAuthStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [notifEnabled, setNotifEnabled] = useState(user?.preferences?.notificationsEnabled ?? true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const { data } = await api.get('/api/users/me/stats');
      setStats(data);
    } catch {
      // Network unavailable
    } finally {
      setIsLoading(false);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifEnabled(value);
    try {
      await api.patch('/api/users/me', {
        preferences: { ...user?.preferences, notificationsEnabled: value },
      });
      await loadStoredAuth();
    } catch {
      setNotifEnabled(!value);
    }
  };

  const maxCategoryCount = stats?.categoryBreakdown?.reduce(
    (max, c) => Math.max(max, c.count), 0
  ) || 1;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.username?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.streakContainer}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakNumber}>{user?.streakCount || 0}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#60a5fa" style={{ marginTop: 32 }} />
        ) : stats ? (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.seen}</Text>
                <Text style={styles.statLabel}>Seen</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.liked}</Text>
                <Text style={styles.statLabel}>Liked</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{stats.saved}</Text>
                <Text style={styles.statLabel}>Saved</Text>
              </View>
            </View>

            {stats.categoryBreakdown?.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Topics You Love</Text>
                {stats.categoryBreakdown.map((item) => (
                  <View key={item.category} style={styles.barRow}>
                    <Text style={styles.barLabel}>{item.category}</Text>
                    <View style={styles.barContainer}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            width: `${(item.count / maxCategoryCount) * 100}%`,
                            backgroundColor: CATEGORY_ACCENT[item.category] || '#60a5fa',
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.barCount}>{item.count}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Push Notifications</Text>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ false: '#333', true: '#60a5fa' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  profileHeader: { alignItems: 'center', paddingTop: 24, paddingBottom: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#60a5fa',
  },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#60a5fa' },
  username: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  streakContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakIcon: { fontSize: 20 },
  streakNumber: { fontSize: 24, fontWeight: '800', color: '#fb923c' },
  streakLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 12, marginBottom: 32 },
  statCard: {
    flex: 1,
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  statNumber: { fontSize: 24, fontWeight: '800', color: '#fff', marginBottom: 4 },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  section: { paddingHorizontal: 20, marginBottom: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16 },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  barLabel: { width: 90, fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' },
  barContainer: { flex: 1, height: 6, backgroundColor: '#222', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  barCount: { width: 24, fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'right' },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  settingLabel: { fontSize: 15, color: '#fff' },
  logoutBtn: {
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  logoutText: { color: '#ef4444', fontSize: 15, fontWeight: '600' },
});
