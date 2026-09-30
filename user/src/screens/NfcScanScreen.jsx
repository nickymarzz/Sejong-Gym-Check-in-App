import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../theme';
import { nfcService, EXPECTED_PAYLOAD } from '../services/nfc/nfcService';
import { delay } from '../services/mock/_utils';

// NFC Scanning screen.
//
// PER PROJECT SPEC:
//   Flow: Phone → Passive SGC-GYM NFC Sticker → Phone → Laravel API
//   The sticker broadcasts ONLY the fixed payload "SGC-GYM".
//   It does NOT store a student ID, capacity, or any database state.
//   Student identity = the logged-in auth token (JWT), NOT the tag content.
//
// This screen just reads the sticker payload. Then the caller (HomeScreen)
// sends the payload + user to checkInService which mimics Laravel.
export default function NfcScanScreen({ mode = 'in', onComplete, onCancel }) {
  const [phase, setPhase] = useState('scanning'); // scanning | detected | invalid | timeout
  const [msg, setMsg] = useState('Hold your phone against the SGC-GYM sticker…');
  const [payload, setPayload] = useState(null);
  const [tagTech, setTagTech] = useState(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    mounted.current = true;
    nfcService.startScan((result) => {
      if (result.success && result.payload === EXPECTED_PAYLOAD) {
        setPhase('detected');
        setPayload(result.payload);
        setTagTech(result.tagTech || null);
        setMsg('SGC-GYM sticker detected ✓');
        delay(900).then(() => {
          if (!mounted.current) return;
          onComplete && onComplete({ success: true, payload: result.payload });
        });
      } else if (result.error === 'invalid_payload') {
        setPhase('invalid');
        setPayload(result.payload);
        setTagTech(result.tagTech || null);
        setMsg(result.message || 'Wrong NFC sticker');
        delay(1500).then(() => {
          if (!mounted.current) return;
          onComplete && onComplete({ success: false, message: result.message });
        });
      } else {
        setPhase('timeout');
        setMsg(result.message || 'No NFC sticker detected');
        delay(1500).then(() => {
          if (!mounted.current) return;
          onComplete && onComplete({ success: false, message: result.message });
        });
      }
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 900,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: true,
    }).start();

    return () => {
      mounted.current = false;
      nfcService.stopScan();
    };
  }, [pulseAnim, fadeAnim, onComplete, onCancel, nfcService]);

  let accentColor = theme.colors.primary;
  if (phase === 'invalid') accentColor = theme.colors.danger;
  else if (phase === 'timeout') accentColor = theme.colors.warning;
  else if (phase === 'detected') accentColor = theme.colors.success;

  const label = mode === 'in' ? 'Checking in with NFC sticker' : 'Checking out with NFC sticker';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0e1a2e' }} edges={['left', 'right']}>
      <Animated.View style={[styles.container, { opacity: fadeAnim, paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          <Pressable
            onPress={() => {
              nfcService.stopScan();
              onCancel && onCancel();
            }}
            style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name="close" size={20} color="#cbd5e1" />
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>

        <View style={styles.labelArea}>
          <Text style={styles.modeLabel}>{label}</Text>
          <Text style={styles.subLabel}>MOCK NFC · Simulated phone → sticker read</Text>
        </View>

        <View style={styles.radar}>
          <Animated.View
            style={[
              styles.pulseRing,
              {
                transform: [{ scale: pulseAnim }],
                opacity: pulseAnim.interpolate({
                  inputRange: [0.4, 1],
                  outputRange: [0.6, 0.05],
                }),
                borderColor: accentColor,
              },
            ]}
          />
          <Animated.View
            style={[
              styles.pulseRing,
              {
                width: 200,
                height: 200,
                transform: [
                  {
                    scale: pulseAnim.interpolate({
                      inputRange: [0.4, 1],
                      outputRange: [0.55, 0.95],
                    }),
                  },
                ],
                opacity: pulseAnim.interpolate({
                  inputRange: [0.4, 1],
                  outputRange: [0.5, 0.05],
                }),
                borderColor: accentColor,
              },
            ]}
          />
          <LinearGradient
            colors={
              phase === 'invalid'
                ? ['#5b1e22', '#8a2a30']
                : phase === 'timeout'
                  ? ['#5b3a0a', '#a86a0e']
                  : phase === 'detected'
                    ? ['#1e4d23', '#2f7d36']
                    : ['#112446', '#1e56a0']
            }
            style={styles.core}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <MaterialCommunityIcons
              name={phase === 'detected' ? 'check-decagram' : 'nfc-tap'}
              size={phase === 'detected' ? 56 : 52}
              color="#fff"
            />
          </LinearGradient>
        </View>

        <View style={styles.msgArea}>
          <Text
            style={[
              styles.msg,
              {
                color:
                  phase === 'invalid'
                    ? '#fca5a5'
                    : phase === 'timeout'
                      ? '#fcd34d'
                      : '#e2e8f0',
              },
            ]}
          >
            {msg}
          </Text>

          {payload ? (
            <View style={styles.payloadBlock}>
              <Text style={styles.payloadLabel}>Sticker payload</Text>
              <Text style={[styles.payloadValue, payload === EXPECTED_PAYLOAD ? { color: '#86efac' } : { color: '#fca5a5' }]}>
                {payload}
              </Text>
              {payload === EXPECTED_PAYLOAD ? (
                <Text style={styles.payloadHint}>
                  ✓ Expected value — will be sent to Laravel with your auth token
                </Text>
              ) : (
                <Text style={styles.payloadHint}>
                  ✗ Expected "{EXPECTED_PAYLOAD}" — backend will reject this
                </Text>
              )}
              {tagTech ? <Text style={styles.payloadTech}>Tag type: {tagTech}</Text> : null}
            </View>
          ) : null}
        </View>

        <View style={[styles.footerHint, { bottom: 24 + insets.bottom }]}>
          <Text style={styles.footerHintTitle}>Per architecture spec:</Text>
          <Text style={styles.footerHintText}>
            • Sticker stores only: "{EXPECTED_PAYLOAD}"{'\n'}
            • No student ID, no capacity, no DB data on tag{'\n'}
            • Student ID comes from logged-in auth token (JWT)
          </Text>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  topBar: {
    paddingTop: 6,
    alignItems: 'flex-end',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },

  labelArea: { marginTop: 24, alignItems: 'center' },
  modeLabel: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  subLabel: {
    marginTop: 6,
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  radar: {
    marginTop: 40,
    alignItems: 'center',
    justifyContent: 'center',
    height: 280,
  },
  pulseRing: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
  },
  core: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },

  msgArea: { marginTop: 28, alignItems: 'center' },
  msg: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  payloadBlock: {
    marginTop: 18,
    width: '100%',
    maxWidth: 360,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  payloadLabel: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  payloadValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
  },
  payloadHint: {
    marginTop: 8,
    color: '#cbd5e1',
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 14,
  },
  payloadTech: {
    marginTop: 6,
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },

  footerHint: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 40,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  footerHintTitle: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  footerHintText: {
    textAlign: 'left',
    color: '#64748b',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
});
