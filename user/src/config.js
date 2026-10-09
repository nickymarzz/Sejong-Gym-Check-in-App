import { Platform } from 'react-native';
import Constants from 'expo-constants';

let customHostOverride = null;

export function setCustomApiHost(host) {
  customHostOverride = host;
}

export function resolveHost() {
  if (customHostOverride) return customHostOverride;

  // 1. Expo Go passes the host machine's IP via hostUri when you scan the QR code
  const hostUri = Constants.expoConfig?.hostUri 
    || Constants.manifest2?.extra?.expoGo?.debuggerHost 
    || Constants.manifest?.debuggerHost
    || (Constants.linkingUri && Constants.linkingUri.includes('://') ? Constants.linkingUri.split('://')[1] : null);

  if (hostUri) {
    const clean = hostUri.split('/')[0].split('?')[0];
    const ip = clean.split(':')[0];
    if (ip && ip !== 'localhost' && ip !== '127.0.0.1') {
      return ip;
    }
  }

  // 2. Web browser:
  if (Platform.OS === 'web') return '127.0.0.1';

  // 3. Android Emulator fallback (when not Expo Go):
  if (Platform.OS === 'android') return '10.0.2.2';

  return '127.0.0.1';
}

export const CONFIG = {
  // Set to true to run offline mock mode; false to connect to the live Laravel backend
  USE_MOCK: false,
  get API_BASE_URL() {
    return `http://${resolveHost()}:8000/api`;
  },
  GYM_ID: 'gym-001',
};

console.log('[SGC] Dynamic API Base URL resolver active');

export default CONFIG;
