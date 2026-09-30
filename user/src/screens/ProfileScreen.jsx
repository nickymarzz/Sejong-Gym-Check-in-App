import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import ToastAlert from '../components/ToastAlert';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';
import { notificationService } from '../services/mock/notificationService';

function iconFor(t) {
  switch (t) {
    case 'capacity': return 'account-group';
    case 'alert': return 'alert-circle-outline';
    default: return 'bell-outline';
  }
}

function prettyTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function ProfileScreen() {
  const { currentUser, logout } = useContext(AuthContext);
  const [notifs, setNotifs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });

  const load = useCallback(async () => {
    const r = await notificationService.getNotifications();
    if (r.success) setNotifs(r.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const markAllRead = async () => {
    await notificationService.markAllRead();
    setToast({ message: 'Marked all as read', type: 'success' });
    load();
  };

  const stats = [
    { label: 'This week', value: '3 sessions', icon: 'calendar-week', color: theme.colors.primary },
    { label: 'Total hours', value: '6.5 hrs', icon: 'clock-outline', color: theme.colors.success },
    { label: 'Current streak', value: '2 days', icon: 'fire', color: theme.colors.warning },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Header userData={currentUser} onLogout={logout} title="Profile" subtitle="Account & Notifications" />
      <ScreenWrapper padTop={false} padBottom={false}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(currentUser?.name || 'DS').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.name}>{currentUser?.name || 'Demo Student'}</Text>
            <Text style={styles.idLine}>ID: {currentUser?.studentId}</Text>
            <Text style={styles.dept}>{currentUser?.department || '—'}</Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          {stats.map(s => (
            <View key={s.label} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: s.color + '18' }]}>
                <MaterialCommunityIcons name={s.icon} size={20} color={s.color} />
              </View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.notifHeader}>
          <Text style={styles.notifTitle}>Notifications</Text>
          <Pressable onPress={markAllRead} style={({ p }) => [styles.markAll, p && { opacity: 0.7 }]}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        </View>

        <ToastAlert message={toast.message} type={toast.type} onClear={() => setToast({ message: '', type: '' })} />

        <FlatList
          data={notifs}
          scrollEnabled={false}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          renderItem={({ item }) => {
            const color =
              item.type === 'alert' ? theme.colors.danger :
              item.type === 'capacity' ? theme.colors.warning :
              theme.colors.primary;
            return (
              <View style={[styles.notifRow, item.read ? { opacity: 0.75 } : null]}>
                <View style={[styles.notifIconWrap, { backgroundColor: color + '18' }]}>
                  <MaterialCommunityIcons name={iconFor(item.type)} size={18} color={color} />
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.notifTitleRow}>{item.title}</Text>
                  <Text style={styles.notifBody}>{item.message}</Text>
                  <Text style={styles.notifTime}>{prettyTime(item.timestamp)}</Text>
                </View>
                {!item.read ? <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} /> : null}
              </View>
            );
          }}
          ListEmptyComponent={
            <Text style={styles.empty}>No notifications yet.</Text>
          }
        />

        <Pressable
          onPress={logout}
          style={({ pressed }) => [styles.logoutRow, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="log-out-outline" size={20} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Log out</Text>
        </Pressable>
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: 18,
    ...theme.shadow.sm,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primaryLight,
  },
  avatarText: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
  name: { fontSize: 18, fontWeight: '800', color: theme.colors.text },
  idLine: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  dept: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500' },

  statsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 26,
  },
  statCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 12,
    alignItems: 'center',
    ...theme.shadow.sm,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: theme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  notifHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  notifTitle: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
  markAll: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  markAllText: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    ...theme.shadow.sm,
  },
  notifIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitleRow: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  notifBody: { fontSize: 12, color: theme.colors.textSecondary, fontWeight: '500', lineHeight: 16 },
  notifTime: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '500', marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },

  empty: { textAlign: 'center', color: theme.colors.textMuted, paddingVertical: 12 },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.dangerBg,
    borderWidth: 1,
    borderColor: theme.colors.dangerBorder,
  },
  logoutText: { color: theme.colors.danger, fontWeight: '800', fontSize: 14, letterSpacing: 0.3 },
});
