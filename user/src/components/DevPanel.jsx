import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';

const SCENARIOS = [
  { id: 'success-checkin', label: '✓ Check-in Success', desc: 'Valid NFC card, not checked in' },
  { id: 'success-checkout', label: '✓ Check-out Success', desc: 'Valid NFC card, currently checked in' },
  { id: 'invalid-nfc', label: '✗ Invalid NFC', desc: 'Unrecognized or expired card' },
  { id: 'already-checkedin', label: '✗ Already Checked In', desc: 'Duplicate check-in attempt' },
  { id: 'already-checkedout', label: '✗ Already Checked Out', desc: 'Check-out without check-in' },
];

export default function DevPanel({ onSimulateNfc, loading }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={() => setExpanded(v => !v)}
        style={({ pressed }) => [styles.toggle, pressed && { opacity: 0.8 }]}
      >
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEV</Text>
        </View>
        <Text style={styles.toggleText}>NFC Simulation Controls</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color="#7e57c2"
          style={{ marginLeft: 'auto' }}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.content}>
          <Text style={styles.note}>
            Note: These buttons simulate the result of the NFC → Backend → MongoDB flow.
            In production, the frontend will receive these results from the Laravel API after a
            physical NFC reader validates the student card.
          </Text>

          <View style={styles.grid}>
            {SCENARIOS.map(s => (
              <Pressable
                key={s.id}
                onPress={() => onSimulateNfc && onSimulateNfc(s.id)}
                disabled={!!loading}
                style={({ pressed }) => [
                  styles.btn,
                  pressed && { backgroundColor: '#f3e5f5', borderColor: '#7e57c2' },
                  loading && { opacity: 0.5 },
                ]}
              >
                <Text style={styles.btnLabel}>{s.label}</Text>
                <Text style={styles.btnDesc}>{s.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: theme.colors.devBorder,
    backgroundColor: theme.colors.devBg,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    ...theme.shadow.sm,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  badge: {
    backgroundColor: theme.colors.dev,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: theme.fontWeight.extrabold,
    letterSpacing: 0.5,
  },
  toggleText: { fontSize: 14, fontWeight: theme.fontWeight.bold, color: '#4527a0' },
  content: { paddingHorizontal: 18, paddingBottom: 18 },
  note: {
    fontSize: 12,
    color: '#4527a0',
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm,
    marginBottom: 14,
    lineHeight: 18,
    fontWeight: theme.fontWeight.medium,
  },
  grid: { gap: 10 },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1c4e9',
    borderRadius: theme.radius.md,
  },
  btnLabel: { fontSize: 13, fontWeight: theme.fontWeight.bold, color: '#311b92', marginBottom: 2 },
  btnDesc: { fontSize: 11, color: '#6a559c', fontWeight: theme.fontWeight.medium },
});
