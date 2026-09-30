import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function CapacityCard({ gymData }) {
  if (!gymData) return null;
  const pct =
    gymData.capacity > 0
      ? Math.min(100, Math.round((gymData.currentOccupancy / gymData.capacity) * 100))
      : 0;

  const progressColor =
    pct >= 90
      ? '#ef5350'
      : pct >= 70
        ? '#ffa726'
        : '#66bb6a';

  const isOpen = gymData.status === 'open';
  const available = Math.max(0, gymData.capacity - gymData.currentOccupancy);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Current Gym Capacity</Text>
        <View style={[styles.statusPill, isOpen ? styles.pillOpen : styles.pillClosed]}>
          <Text style={[styles.pillText, isOpen ? styles.textOpen : styles.textClosed]}>
            {isOpen ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>

      <View style={styles.capacityDisplay}>
        <View style={styles.numbersRow}>
          <Text style={styles.current}>{gymData.currentOccupancy}</Text>
          <Text style={styles.divider}>/</Text>
          <Text style={styles.max}>{gymData.capacity}</Text>
        </View>
        <Text style={styles.percent}>{pct}% occupied</Text>
      </View>

      <View style={styles.progressBg}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${pct}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Hours</Text>
          <Text style={styles.metaValue}>
            {gymData.openingHours.open} — {gymData.openingHours.close}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Available</Text>
          <Text style={styles.metaValue}>{available} spots</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xxl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...theme.shadow.md,
    marginBottom: theme.spacing.xl,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 12,
  },
  cardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
  },
  pillOpen: {
    backgroundColor: theme.colors.successBg,
    borderColor: theme.colors.successBorder,
  },
  pillClosed: {
    backgroundColor: theme.colors.dangerBg,
    borderColor: theme.colors.dangerBorder,
  },
  pillText: { fontSize: 12, fontWeight: theme.fontWeight.bold, letterSpacing: 0.3 },
  textOpen: { color: theme.colors.success },
  textClosed: { color: theme.colors.danger },

  capacityDisplay: { alignItems: 'center', marginBottom: 20 },
  numbersRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  current: {
    fontSize: theme.fontSize.hero,
    fontWeight: theme.fontWeight.extrabold,
    color: theme.colors.primary,
    lineHeight: 50,
  },
  divider: { fontSize: 32, fontWeight: theme.fontWeight.bold, color: theme.colors.textMuted },
  max: { fontSize: 32, fontWeight: theme.fontWeight.bold, color: theme.colors.textSecondary },
  percent: { fontSize: 15, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary },

  progressBg: {
    width: '100%',
    height: 10,
    backgroundColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressFill: { height: '100%', borderRadius: theme.radius.pill },

  metaRow: { flexDirection: 'row', gap: 12 },
  metaItem: {
    flex: 1,
    padding: 12,
    backgroundColor: theme.colors.bg,
    borderRadius: theme.radius.md,
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  metaValue: { fontSize: 14, fontWeight: theme.fontWeight.bold, color: theme.colors.text },
});
