import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';

export default function PrimaryButton({
  userData,
  gymData,
  onPress,
  loading,
}) {
  const isCheckedIn = !!userData?.checkedIn;
  const status = (gymData?.status || '').toLowerCase();
  const isOpen = status === 'open';
  const isMaintenance = status === 'maintenance';
  const isFull = gymData ? gymData.currentOccupancy >= gymData.capacity : false;

  const disabled =
    !!loading || (!isOpen && !isCheckedIn) || (isFull && !isCheckedIn);

  const gradientColors = isCheckedIn
    ? ['#ef5350', '#c62828']
    : [theme.colors.primary, theme.colors.primaryDark];

  let hint = '';
  if (isMaintenance && !isCheckedIn) hint = 'Gym is currently under maintenance';
  else if (!isOpen && !isCheckedIn) hint = 'Gym is currently closed';
  else if (isFull && !isCheckedIn) hint = 'Gym is at full capacity';
  else if (isCheckedIn) hint = 'Tap to end your session';
  else hint = 'Tap to start your gym session';

  return (
    <View style={styles.wrap}>
      <Pressable onPress={onPress} disabled={disabled} style={{ borderRadius: theme.radius.lg }}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.btn,
            { opacity: disabled ? 0.55 : 1 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 10 }} />
          ) : null}
          <Text style={styles.btnText}>
            {loading ? 'Processing…' : isCheckedIn ? 'CHECK OUT' : 'CHECK IN'}
          </Text>
        </LinearGradient>
      </Pressable>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginBottom: theme.spacing.xxl },
  btn: {
    width: '100%',
    minHeight: 64,
    paddingHorizontal: 32,
    paddingVertical: 20,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...theme.shadow.md,
  },
  btnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: theme.fontWeight.extrabold,
    letterSpacing: 1.5,
  },
  hint: {
    marginTop: 12,
    fontSize: 13,
    fontWeight: theme.fontWeight.semibold,
    color: theme.colors.textMuted,
    textAlign: 'center',
  },
});
