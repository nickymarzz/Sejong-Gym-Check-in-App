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
import { useFocusEffect } from '@react-navigation/native';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import ToastAlert from '../components/ToastAlert';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';
import { notificationService, checkInService } from '../services';
import { initialCheckInHistory } from '../data/mockCheckInHistory';

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

function computeUserStats(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return {
      weeklySessions: '0 sessions',
      totalHours: '0 hrs',
      streak: '0 days',
    };
  }

  const now = new Date();

  // 1. Total hours
  let totalMinutes = 0;
  history.forEach(item => {
    if (typeof item.durationMinutes === 'number' && item.durationMinutes > 0) {
      totalMinutes += item.durationMinutes;
    }
  });
  const totalHrs = (totalMinutes / 60).toFixed(1);
  const formattedHours = totalHrs.endsWith('.0') 
    ? `${Math.floor(totalMinutes / 60)} hrs` 
    : `${totalHrs} hrs`;

  // 2. This week sessions (past 7 days)
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weeklySessionsCount = history.filter(item => {
    const time = item.timestamp || (item.rawCheckInTime ? new Date(item.rawCheckInTime).getTime() : 0);
    return time >= oneWeekAgo.getTime();
  }).length;

  // 3. Consecutive day streak
  const dateSet = new Set();
  const getLocalDateStr = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  history.forEach(item => {
    const d = item.rawCheckInTime ? new Date(item.rawCheckInTime) : (item.timestamp ? new Date(item.timestamp) : null);
    if (d && !isNaN(d.getTime())) {
      dateSet.add(getLocalDateStr(d));
    }
  });

  let streak = 0;
  const cursor = new Date(now);
  const todayStr = getLocalDateStr(cursor);
  cursor.setDate(cursor.getDate() - 1);
  const yesterdayStr = getLocalDateStr(cursor);

  let checkCursor = new Date(now);
  if (!dateSet.has(todayStr) && dateSet.has(yesterdayStr)) {
    checkCursor.setDate(checkCursor.getDate() - 1);
  }

  while (true) {
    const ds = getLocalDateStr(checkCursor);
    if (dateSet.has(ds)) {
      streak++;
      checkCursor.setDate(checkCursor.getDate() - 1);
    } else {
      break;
    }
  }

  return {
    weeklySessions: `${weeklySessionsCount} session${weeklySessionsCount === 1 ? '' : 's'}`,
    totalHours: formattedHours,
    streak: `${streak} day${streak === 1 ? '' : 's'}`,
  };
}

export default function ProfileScreen() {
  const { currentUser, logout } = useContext(AuthContext);
  const [notifs, setNotifs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [statsData, setStatsData] = useState({
    weeklySessions: '—',
    totalHours: '—',
    streak: '—',
  });

  const load = useCallback(async () => {
    try {
      const r = await notificationService.getNotifications();
      if (r?.success && Array.isArray(r.data)) setNotifs(r.data);
    } catch (_) {}

    try {
      const h = await checkInService.getHistory();
      if (h?.success && Array.isArray(h.data) && h.data.length > 0) {
        setStatsData(computeUserStats(h.data));
        return;
      }
    } catch (_) {}

    const filtered = initialCheckInHistory.filter(
      r => !currentUser?.userId || r.userId === currentUser.userId,
    );
    setStatsData(computeUserStats(filtered));
  }, [currentUser?.userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
    { label: 'This week', value: statsData.weeklySessions, icon: 'calendar-week', color: theme.colors.primary },
    { label: 'Total hours', value: statsData.totalHours, icon: 'clock-outline', color: theme.colors.success },
    { label: 'Current streak', value: statsData.streak, icon: 'fire', color: theme.colors.warning },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Header userData={currentUser} onLogout={logout} title="Profile" subtitle="Account & Notifications" />
      <ScreenWrapper
        padTop={false}
        padBottom={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
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
