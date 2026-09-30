// ========== NFC SERVICE (Phone → Passive SGC-GYM Sticker) ==========
//
// === ARCHITECTURE PER SPEC ======================================
// Student Phone → Passive NFC Sticker → Phone → Laravel REST API → MongoDB
// Sticker payload: FIXED STRING "SGC-GYM"
// Sticker stores: NO student ID, NO capacity, NO status, NO DB info.
// Student identity comes from the LOGGED-IN AUTH TOKEN in the app,
// NOT from anything written on the sticker.
//
// === FUTURE REPLACEMENT =========================================
// Currently MOCK behavior — no real NFC hardware is read.
// Later, swap out this mock IMPLEMENTATION ONLY for real native NFC
// using `react-native-nfc-manager` (requires Expo Dev Build, not Go).
//
// Public API exposed to UI screens (DO NOT change):
//   startScan(callback({ success, payload, message, tagTech? }))
//   stopScan()
//   readTag() : Promise<{ success, payload, message }>
//
// Constants:
//   EXPECTED_PAYLOAD   = "SGC-GYM"  (sticker broadcasts this exact string)
//   VALID_TAG_TECH     = "NFC Forum Type 2"  (the passive sticker type)

import { delay } from '../mock/_utils';

export const EXPECTED_PAYLOAD = 'SGC-GYM';
export const VALID_TAG_TECH = 'NFC Forum Type 2';

let scanning = false;
let scanTimer = null;

// 3 mock outcomes for development:
//  85% chance → valid SGC-GYM sticker found
//  10% chance → random sticker (e.g. "UNKNOWN-STICKER")
//  5% chance → timeout / nothing detected
function pickOutcome() {
  const r = Math.random();
  if (r < 0.85)
    return {
      type: 'ok',
      payload: EXPECTED_PAYLOAD,
      tagTech: VALID_TAG_TECH,
      delay: 1600,
    };
  if (r < 0.95)
    return {
      type: 'invalid_payload',
      payload: 'UNKNOWN-STICKER',
      tagTech: VALID_TAG_TECH,
      delay: 1500,
    };
  return { type: 'timeout', delay: 5000 };
}

async function startScan(onTagDetected) {
  if (scanning) return { scanning: true };
  scanning = true;

  const outcome = pickOutcome();
  scanTimer = setTimeout(() => {
    scanning = false;
    scanTimer = null;
    let result;
    switch (outcome.type) {
      case 'ok':
        result = {
          success: true,
          payload: outcome.payload,
          tagTech: outcome.tagTech,
        };
        break;
      case 'invalid_payload':
        result = {
          success: false,
          error: 'invalid_payload',
          payload: outcome.payload,
          tagTech: outcome.tagTech,
          message: `Unrecognized sticker payload. Expected "${EXPECTED_PAYLOAD}".`,
        };
        break;
      default:
        result = {
          success: false,
          error: 'timeout',
          message: 'No NFC sticker detected. Try bringing your phone closer.',
        };
    }
    onTagDetected && onTagDetected(result);
  }, outcome.delay);

  await delay(50);
  return { scanning: true };
}

function stopScan() {
  if (scanTimer) {
    clearTimeout(scanTimer);
    scanTimer = null;
  }
  scanning = false;
  return { scanning: false };
}

function readTag() {
  return new Promise((resolve) => {
    startScan((result) => resolve(result));
  });
}

export const nfcService = {
  EXPECTED_PAYLOAD,
  VALID_TAG_TECH,
  startScan,
  stopScan,
  readTag,
};

export default nfcService;
