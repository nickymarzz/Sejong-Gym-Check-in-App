import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiRequest } from '../api/client';

// Configure foreground notification behavior so alert and sound trigger
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/**
 * Configure Android notification channels and request permission
 */
export async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'web') return null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Gym Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#002667',
        sound: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted.');
      return null;
    }

    let token = null;
    try {
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      token = deviceToken?.data;
    } catch (_) {
      try {
        const expoToken = await Notifications.getExpoPushTokenAsync();
        token = expoToken?.data;
      } catch (err) {
        console.warn('Push token retrieval notice:', err?.message);
      }
    }

    return token;
  } catch (error) {
    console.warn('Failed to register for push notifications:', error?.message);
    return null;
  }
}

/**
 * Send the FCM token to Laravel backend to link it with the student's profile
 */
export async function syncPushTokenToBackend(fcmToken) {
  if (!fcmToken) return { success: false };
  try {
    const res = await apiRequest('/users/profile', {
      method: 'PATCH',
      body: { fcmToken },
    });
    return res;
  } catch (err) {
    console.warn('Failed to sync push token with backend:', err?.message);
    return { success: false, error: err?.message };
  }
}

/**
 * Setup listeners for incoming foreground push notifications and tray tap responses
 */
export function addNotificationListeners(onNotificationReceived, onNotificationResponse) {
  if (Platform.OS === 'web') return () => {};

  const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
    if (typeof onNotificationReceived === 'function') {
      onNotificationReceived(notification);
    }
  });

  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    if (typeof onNotificationResponse === 'function') {
      onNotificationResponse(response);
    }
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}
