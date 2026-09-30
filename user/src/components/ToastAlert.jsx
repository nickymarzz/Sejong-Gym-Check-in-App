import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function ToastAlert({ message, type, onClear, duration = 4000 }) {
  const [visible, setVisible] = useState(!!message);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (message) {
      setVisible(true);
      Animated.timing(anim, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    }
  }, [message, anim]);

  useEffect(() => {
    if (!message || !onClear || !duration) return undefined;
    const t = setTimeout(() => onClear(), duration);
    return () => clearTimeout(t);
  }, [message, onClear, duration]);

  if (!visible || !message) return null;

  const isSuccess = type === 'success';
  const bg = isSuccess ? theme.colors.successBg : theme.colors.dangerBg;
  const borderColor = isSuccess ? theme.colors.successBorder : theme.colors.dangerBorder;
  const color = isSuccess ? theme.colors.success : theme.colors.danger;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          backgroundColor: bg,
          borderColor,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [-8, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={isSuccess ? 'check-circle-outline' : 'alert-circle-outline'}
          size={22}
          color={color}
        />
      </View>
      <Text style={[styles.text, { color }]} numberOfLines={2}>
        {message}
      </Text>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={10} style={styles.closeBtn}>
          <Text style={[styles.closeText, { color, opacity: 0.65 }]}>✕</Text>
        </Pressable>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: theme.radius.md,
    marginBottom: 20,
    borderWidth: 1,
  },
  iconWrap: { width: 22, height: 22 },
  text: { flex: 1, fontSize: 14, fontWeight: theme.fontWeight.semibold, lineHeight: 18 },
  closeBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  closeText: { fontSize: 18, fontWeight: '400' },
});
