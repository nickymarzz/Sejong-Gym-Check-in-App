import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, Modal } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { theme } from '../theme';
import ScreenWrapper from '../components/ScreenWrapper';
import Header from '../components/Header';
import CapacityCard from '../components/CapacityCard';
import UserStatus from '../components/UserStatus';
import PrimaryButton from '../components/PrimaryButton';
import ToastAlert from '../components/ToastAlert';
import DevPanel from '../components/DevPanel';
import NfcScanScreen from './NfcScanScreen';
import { gymService } from '../services/mock/gymService';
import { checkInService } from '../services/mock/checkInService';
import { notificationService } from '../services/mock/notificationService';
import { delay } from '../services/mock/_utils';

export default function HomeScreen() {
  const { currentUser, updateUser, logout } = useContext(AuthContext);

  const [gymData, setGymData] = useState(null);
  const [userData, setUserData] = useState(currentUser);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [nfcVisible, setNfcVisible] = useState(false);
  const [nfcMode, setNfcMode] = useState('in'); // 'in' | 'out'

  useEffect(() => {
    gymService.getGymStatus('gym-001')
      .then(r => {
        if (r.success) {
          setGymData(r.data);
        } else {
          setToast({ message: r.message || 'Failed to load gym status', type: 'error' });
        }
      })
      .catch(() => {
        setToast({ message: 'Failed to load gym status — please refresh', type: 'error' });
      });
  }, []);

  useEffect(() => {
    setUserData(currentUser);
  }, [currentUser]);

  const setMessage = useCallback((message, type) => {
    setToast({ message, type });
  }, []);

  const clearMessage = useCallback(() => {
    setToast({ message: '', type: '' });
  }, []);

  const applyResult = useCallback((result) => {
    if (!result) return;
    if (result.success) {
      if (result.updatedGym) setGymData(result.updatedGym);
      if (result.updatedUser) {
        setUserData(result.updatedUser);
        updateUser(result.updatedUser);
      }
      // Also push a mock notification after successful check in/out
      if (result.updatedUser?.checkedIn) {
        notificationService.getNotifications();
      }
    }
    setMessage(result.message, result.type || 'success');
  }, [setMessage, updateUser]);

  const runCheckIn = useCallback(async (nfcPayload) => {
    setLoading(true);
    clearMessage();
    try {
      if (!gymData) {
        setMessage('Gym status not loaded — please restart the app', 'error');
        return;
      }
      const result = await checkInService.checkIn({
        gymId: gymData.gymId,
        userId: userData.userId,
        nfcPayload,
      });
      applyResult(result);
    } catch (e) {
      setMessage('Network error — please try again', 'error');
    } finally {
      setLoading(false);
    }
  }, [gymData, userData, clearMessage, applyResult, setMessage]);

  const runCheckOut = useCallback(async (nfcPayload) => {
    setLoading(true);
    clearMessage();
    try {
      if (!gymData) {
        setMessage('Gym status not loaded — please restart the app', 'error');
        return;
      }
      const result = await checkInService.checkOut({
        gymId: gymData.gymId,
        userId: userData.userId,
        nfcPayload,
      });
      applyResult(result);
    } catch (e) {
      setMessage('Network error — please try again', 'error');
    } finally {
      setLoading(false);
    }
  }, [gymData, userData, clearMessage, applyResult, setMessage]);

  // Primary button opens the NFC scan flow (per user request to simulate NFC step).
  const handlePrimaryAction = useCallback(() => {
    if (loading) return;
    const isCheckedIn = !!userData?.checkedIn;
    const isOpen = gymData?.status === 'open';
    const isFull = gymData ? gymData.currentOccupancy >= gymData.capacity : false;

    // Block impossible states immediately (mirrors PrimaryButton disabled logic).
    if (!isCheckedIn) {
      if (!isOpen) {
        setMessage('Gym is currently closed', 'error');
        return;
      }
      if (isFull) {
        setMessage('Gym is at full capacity', 'error');
        return;
      }
    }
    setNfcMode(isCheckedIn ? 'out' : 'in');
    setNfcVisible(true);
  }, [gymData, userData, loading, setMessage]);

  const handleNfcComplete = useCallback(async (nfcResult) => {
    setNfcVisible(false);
    if (!nfcResult?.success) {
      setMessage(nfcResult?.message || 'NFC scan failed', 'error');
      return;
    }
    // Per spec: send the fixed NFC sticker payload (SGC-GYM) to checkInService.
    // Student identity is carried by userData.userId (== JWT later).
    const payload = nfcResult.payload;
    if (nfcMode === 'in') {
      await runCheckIn(payload);
    } else {
      await runCheckOut(payload);
    }
  }, [nfcMode, runCheckIn, runCheckOut, setMessage]);

  const handleSimulateNfc = useCallback(async (scenario) => {
    setLoading(true);
    clearMessage();
    try {
      const r = await checkInService.simulateNfcScenario(scenario, gymData, userData);
      applyResult(r);
    } catch (e) {
      setMessage('NFC simulation error', 'error');
    } finally {
      setLoading(false);
    }
  }, [gymData, userData, clearMessage, applyResult, setMessage]);

  const first = useMemo(() => (userData?.name || '').split(' ')[0] || 'there', [userData]);

  return (
    <View style={{ flex: 1 }}>
      <Header userData={userData} onLogout={logout} />

      <ScreenWrapper padTop={false} padBottom={false}>
        <View style={styles.welcome}>
          <Text style={styles.welcomeTitle}>Welcome back, {first} 👋</Text>
          <Text style={styles.welcomeSub}>
            Ready for your workout at {gymData?.gymName || 'the gym'}?
          </Text>
        </View>

        <ToastAlert
          message={toast.message}
          type={toast.type}
          onClear={clearMessage}
        />

        <CapacityCard gymData={gymData} />
        <UserStatus userData={userData} />

        <PrimaryButton
          userData={userData}
          gymData={gymData}
          onPress={handlePrimaryAction}
          loading={loading}
        />

        <DevPanel onSimulateNfc={handleSimulateNfc} loading={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            SGC · Sejong Gym Check-in System · MVP Prototype
          </Text>
        </View>
      </ScreenWrapper>

      <Modal visible={nfcVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setNfcVisible(false)}>
        <NfcScanScreen
          mode={nfcMode}
          onComplete={handleNfcComplete}
          onCancel={() => setNfcVisible(false)}
        />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  welcome: { marginBottom: 24 },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: theme.fontWeight.extrabold,
    marginBottom: 4,
    color: theme.colors.text,
  },
  welcomeSub: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: theme.fontWeight.medium,
  },
  footer: {
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: theme.fontWeight.medium,
  },
});
