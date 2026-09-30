import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function UserStatus({ userData }) {
  if (!userData) return null;
  const inGym = !!userData.checkedIn;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Your Check-in Status</Text>

      <View style={[styles.statusBox, inGym ? styles.checkedInBox : styles.checkedOutBox]}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={inGym ? 'check-circle-outline' : 'clock-outline'}
            size={28}
            color={inGym ? theme.colors.success : theme.colors.textMuted}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={[styles.statusLabel, inGym ? styles.textIn : styles.textOut]}>
            {inGym ? 'Checked In' : 'Not Checked In'}
          </Text>
          {inGym && userData.checkInTime ? (
            <Text style={styles.statusDetail}>Since {userData.checkInTime}</Text>
          ) : null}
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
    marginBottom: theme.spacing.xxl,
  },
  cardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.bold,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    marginTop: 4,
  },
  checkedInBox: {
    backgroundColor: theme.colors.successBg,
    borderWidth: 2,
    borderColor: theme.colors.successBorder,
  },
  checkedOutBox: {
    backgroundColor: theme.colors.bg,
    borderWidth: 2,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.sm,
  },
  statusLabel: { fontSize: 20, fontWeight: theme.fontWeight.extrabold, marginBottom: 2 },
  textIn: { color: theme.colors.success },
  textOut: { color: theme.colors.textSecondary },
  statusDetail: { fontSize: 14, fontWeight: theme.fontWeight.semibold, color: theme.colors.textSecondary },
});
