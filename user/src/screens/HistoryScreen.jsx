import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import { theme } from '../theme';
import { initialCheckInHistory } from '../data/mockCheckInHistory';
import { AuthContext } from '../context/AuthContext';

function statusStyle(s) {
  switch (s) {
    case 'checkedOut':
      return {
        bg: theme.colors.successBg,
        text: theme.colors.success,
        label: 'Completed',
        icon: 'check-circle-outline',
      };
    case 'checkedIn':
      return {
        bg: theme.colors.primaryLight,
        text: theme.colors.primary,
        label: 'In Progress',
        icon: 'run',
      };
    case 'missed':
      return {
        bg: theme.colors.dangerBg,
        text: theme.colors.danger,
        label: 'No Check-out',
        icon: 'alert-circle-outline',
      };
    default:
      return {
        bg: theme.colors.bg,
        text: theme.colors.textMuted,
        label: s,
        icon: 'help-circle-outline',
      };
  }
}

export default function HistoryScreen() {
  const { currentUser, logout } = useContext(AuthContext);
  const [items, setItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    await new Promise((res) => setTimeout(res, 300));
    const filtered = initialCheckInHistory.filter(
      (r) => !currentUser?.userId || r.userId === currentUser.userId,
    );
    setItems(filtered.slice());
  };

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [currentUser?.userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const s = statusStyle(item.status);
    return (
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.date}>{item.dateLabel}</Text>
            <Text style={styles.gym}>{item.gymName}</Text>
          </View>
          <View style={[styles.statusPill, { backgroundColor: s.bg }]}>
            <MaterialCommunityIcons
              name={s.icon}
              size={13}
              color={s.text}
              style={{ marginRight: 4 }}
            />
            <Text style={[styles.statusText, { color: s.text }]}>{s.label}</Text>
          </View>
        </View>

        <View style={styles.times}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>IN</Text>
            <Text style={styles.timeValue}>{item.checkInTime}</Text>
          </View>
          <MaterialCommunityIcons
            name="arrow-right"
            size={16}
            color={theme.colors.textMuted}
          />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>OUT</Text>
            <Text style={styles.timeValue}>{item.checkOutTime || '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.durationBlock}>
            <Text style={styles.timeLabel}>DURATION</Text>
            <Text style={styles.durationValue}>
              {item.durationMinutes
                ? `${Math.floor(item.durationMinutes / 60)}h ${item.durationMinutes % 60}m`
                : '—'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Header
        userData={currentUser}
        onLogout={logout}
        title="History"
        subtitle="Your sessions"
      />
      <ScreenWrapper padTop={false} padBottom={false} scroll={false}>
        <View style={styles.listHeader}>
          <View>
            <Text style={styles.title}>Check-in History</Text>
            <Text style={styles.sub}>{items.length} gym visits</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>Loading…</Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40, gap: 14 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons
                  name="clipboard-text-clock-outline"
                  size={44}
                  color={theme.colors.textMuted}
                />
                <Text style={styles.emptyTitle}>No visits yet</Text>
                <Text style={styles.empty}>
                  Check in at the gym to see your sessions here.
                </Text>
              </View>
            }
          />
        )}
      </ScreenWrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    gap: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.text,
  },
  sub: {
    fontSize: 13,
    fontWeight: theme.fontWeight.medium,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    ...theme.shadow.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  date: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  gym: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
  },
  timeBlock: { flex: 1, alignItems: 'center' },
  timeLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  timeValue: { fontSize: 15, fontWeight: '800', color: theme.colors.text },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.border,
    marginHorizontal: 4,
  },
  durationBlock: { flex: 1, alignItems: 'center' },
  durationValue: {
    fontSize: 14,
    fontWeight: '800',
    color: theme.colors.primary,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: theme.colors.textSecondary,
  },
  empty: {
    fontSize: 13,
    color: theme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});
