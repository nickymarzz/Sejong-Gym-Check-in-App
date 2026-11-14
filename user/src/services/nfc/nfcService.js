// ========== NFC SERVICE (Phone → Passive SGC-GYM Sticker) ==========
//
// === ARCHITECTURE PER SPEC ======================================
// Student Phone → Passive NFC Sticker → Phone → Laravel REST API → MongoDB
// Sticker payload: FIXED STRING "SGC-GYM"
// Sticker stores: NO student ID, NO capacity, NO status, NO DB info.
// Student identity comes from the LOGGED-IN AUTH TOKEN in the app,
// NOT from anything written on the sticker.
//
// Native NFC Implementation using `react-native-nfc-manager`
//
// Public API exposed to UI screens:
//   startScan(callback({ success, payload, message, error, tagTech?, isHardware? }))
//   stopScan()
//   readTag() : Promise<{ success, payload, message, error }>
//   checkStatus() : Promise<{ supported: boolean, enabled: boolean }>
//   goToSettings() : Promise<void>
//   simulateScan(outcomeType, callback)

import { Platform } from 'react-native';
import { delay } from '../mock/_utils';

export const EXPECTED_PAYLOAD = 'SGC-GYM';
export const VALID_TAG_TECH = 'NFC Forum Type 2';

// Safely require react-native-nfc-manager so web/emulator environments don't throw
let NfcManager = null;
let NfcTech = null;
let Ndef = null;

try {
  const nfcModule = require('react-native-nfc-manager');
  NfcManager = nfcModule.default || nfcModule;
  NfcTech = nfcModule.NfcTech;
  Ndef = nfcModule.Ndef;
} catch (e) {
  // Graceful fallback for non-native / unsupported targets
  NfcManager = null;
}

let isInitialized = false;
let scanning = false;
let scanTimer = null;

async function initNfc() {
  if (isInitialized || !NfcManager || Platform.OS === 'web') return;
  try {
    await NfcManager.start();
    isInitialized = true;
  } catch (err) {
    console.warn('[NFC] Initialization warning:', err);
  }
}

export async function checkStatus() {
  if (!NfcManager || Platform.OS === 'web') {
    return { supported: false, enabled: false };
  }
  try {
    await initNfc();
    const supported = await NfcManager.isSupported();
    const enabled = supported ? await NfcManager.isEnabled() : false;
    return { supported: !!supported, enabled: !!enabled };
  } catch (err) {
    return { supported: false, enabled: false };
  }
}

export async function goToSettings() {
  if (NfcManager?.goToNfcSetting) {
    try {
      await NfcManager.goToNfcSetting();
    } catch (e) {
      console.warn('[NFC] Could not open NFC settings:', e);
    }
  }
}

function decodeRecord(record) {
  if (!record || !record.payload) return '';
  try {
    if (Ndef && Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_TEXT)) {
      return Ndef.text.decodePayload(record.payload) || '';
    }
    if (Ndef && Ndef.isType(record, Ndef.TNF_WELL_KNOWN, Ndef.RTD_URI)) {
      return Ndef.uri.decodePayload(record.payload) || '';
    }
  } catch (e) {
    // Continue to fallback
  }

  try {
    if (Array.isArray(record.payload) || record.payload instanceof Uint8Array) {
      const chars = Array.from(record.payload)
        .map(b => String.fromCharCode(b))
        .join('');
      // Strip common non-printable NDEF header prefixes
      return chars.replace(/^[\x00-\x1F]+/, '').trim();
    }
  } catch (e) {
    // Ignore
  }

  return String(record.payload || '').trim();
}

function parseNdefPayload(tag) {
  if (!tag) return null;

  // Case 1: Standard NDEF message array
  if (tag.ndefMessage && Array.isArray(tag.ndefMessage) && tag.ndefMessage.length > 0) {
    for (const record of tag.ndefMessage) {
      const decoded = decodeRecord(record);
      if (decoded) {
        const clean = decoded.trim();
        // Check exact match or check if URL ends with / contains SGC-GYM
        if (clean === EXPECTED_PAYLOAD || clean.includes(EXPECTED_PAYLOAD)) {
          return EXPECTED_PAYLOAD;
        }
        return clean;
      }
    }
  }

  // Case 2: Direct payload string or id fallback
  if (tag.payload) return String(tag.payload).trim();
  if (tag.id) return String(tag.id).trim();

  return null;
}

export async function startScan(onTagDetected) {
  if (scanning) return { scanning: true };
  scanning = true;

  const status = await checkStatus();

  // If physical NFC is supported and enabled, use native hardware
  if (status.supported) {
    if (!status.enabled) {
      scanning = false;
      onTagDetected &&
        onTagDetected({
          success: false,
          error: 'nfc_disabled',
          message: 'NFC is turned off on this device. Tap Settings to turn it on.',
          isHardware: true,
        });
      return { scanning: false };
    }

    try {
      // Clean up any stale session before requesting
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (_) {}

      // Listen for NDEF or NfcA passive tags
      await NfcManager.requestTechnology([NfcTech.Ndef, NfcTech.NfcA]);
      const tag = await NfcManager.getTag();

      if (!scanning) return { scanning: false }; // Scan was stopped while waiting
      scanning = false;

      const rawPayload = parseNdefPayload(tag);
      const isExpected = rawPayload === EXPECTED_PAYLOAD;

      if (isExpected) {
        onTagDetected &&
          onTagDetected({
            success: true,
            payload: EXPECTED_PAYLOAD,
            tagTech: VALID_TAG_TECH,
            tagId: tag?.id || null,
            isHardware: true,
          });
      } else {
        onTagDetected &&
          onTagDetected({
            success: false,
            error: 'invalid_payload',
            payload: rawPayload || 'UNKNOWN',
            tagTech: VALID_TAG_TECH,
            message: `Unrecognized sticker payload (${rawPayload || 'EMPTY'}). Expected "${EXPECTED_PAYLOAD}".`,
            isHardware: true,
          });
      }
      return { scanning: false };
    } catch (err) {
      const isCancelled =
        err?.message?.includes?.('cancelled') ||
        err?.message?.includes?.('User canceled') ||
        !scanning;

      scanning = false;
      if (!isCancelled) {
        onTagDetected &&
          onTagDetected({
            success: false,
            error: 'timeout',
            message: 'No NFC sticker detected. Try bringing your phone closer to the sticker.',
            isHardware: true,
          });
      }
      return { scanning: false };
    } finally {
      try {
        await NfcManager.cancelTechnologyRequest();
      } catch (_) {}
    }
  }

  // --- Fallback for Emulators, Web, or Devices without NFC hardware ---
  scanTimer = setTimeout(() => {
    scanning = false;
    scanTimer = null;
    onTagDetected &&
      onTagDetected({
        success: true,
        payload: EXPECTED_PAYLOAD,
        tagTech: VALID_TAG_TECH,
        isHardware: false,
      });
  }, 1600);

  return { scanning: true, isHardware: false };
}

export function stopScan() {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
  if (NfcManager) {
    try {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    } catch (_) {}
  }
  scanning = false;
  return { scanning: false };
}

export function readTag() {
  return new Promise(resolve => {
    startScan(result => resolve(result));
  });
}

export function simulateScan(outcomeType = 'ok', onTagDetected) {
  stopScan();
  scanning = false;

  if (outcomeType === 'ok') {
    onTagDetected &&
      onTagDetected({
        success: true,
        payload: EXPECTED_PAYLOAD,
        tagTech: VALID_TAG_TECH,
        isHardware: false,
      });
  } else if (outcomeType === 'invalid_payload') {
    onTagDetected &&
      onTagDetected({
        success: false,
        error: 'invalid_payload',
        payload: 'INVALID-STICKER',
        tagTech: VALID_TAG_TECH,
        message: `Unrecognized sticker payload. Expected "${EXPECTED_PAYLOAD}".`,
        isHardware: false,
      });
  } else {
    onTagDetected &&
      onTagDetected({
        success: false,
        error: 'timeout',
        message: 'No NFC sticker detected. Try bringing your phone closer.',
        isHardware: false,
      });
  }
}

export const nfcService = {
  EXPECTED_PAYLOAD,
  VALID_TAG_TECH,
  startScan,
  stopScan,
  readTag,
  checkStatus,
  goToSettings,
  simulateScan,
};

export default nfcService;
