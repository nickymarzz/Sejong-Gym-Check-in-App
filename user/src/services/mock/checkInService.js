// ========== MOCK CHECK-IN SERVICE ==========
//
// FUTURE LARAVEL CONTRACT (do NOT change the request/response shape):
//   POST /api/checkins         (HTTPS, Bearer JWT identifies the student)
//     Body: { gymId, nfcPayload }
//   POST /api/checkouts        (same, Bearer JWT)
//     Body: { gymId, nfcPayload }
//   Response: { success, message, type, updatedGym, updatedUser }
//
// PER PROJECT SPEC — CRITICAL:
//   The NFC sticker contains ONLY the fixed payload "SGC-GYM".
//   Student identity comes SOLELY from the Bearer JWT auth token.
//   Student ID, capacity, status are NEVER stored on or decoded from the sticker.
//   Final capacity logic, concurrency, double-tap safety lives in Laravel + MongoDB.
//   This mock only mirrors what the backend will return.

import { delay, formatTime } from './_utils';
import { gymService } from './gymService';
import { nfcService, EXPECTED_PAYLOAD } from '../nfc/nfcService';

// ---------- public API ----------

export async function checkIn({ gymId, userId, nfcPayload } = {}) {
  await delay(800);

  const guard = preconditions({ gymId, userId, nfcPayload });
  if (guard) return guard;

  const gymData = await loadGym(gymId);
  if (!gymData) return fail('Gym not found');
  const userState = loadUserState(userId);

  if (gymData.status !== 'open') return fail('Gym is currently closed');
  if (userState.checkedIn) return fail('Already checked in');
  if (gymData.currentOccupancy >= gymData.capacity) return fail('Gym is at full capacity');

  const gymUpdate = gymService._updateLiveGym(gymId, {
    currentOccupancy: gymData.currentOccupancy + 1,
  });
  if (!gymUpdate.success) return fail(gymUpdate.message || 'Failed to update gym state');
  const updatedGym = gymUpdate.data;

  const now = new Date();
  const updatedUser = storeUserState(userId, {
    checkedIn: true,
    checkInTime: formatTime(now),
    lastCheckInAt: now.toISOString(),
  });

  return ok('Check-in successful', 'success', { updatedGym, updatedUser });
}

export async function checkOut({ gymId, userId, nfcPayload } = {}) {
  await delay(800);

  const guard = preconditions({ gymId, userId, nfcPayload });
  if (guard) return guard;

  const gymData = await loadGym(gymId);
  if (!gymData) return fail('Gym not found');
  const userState = loadUserState(userId);

  if (!userState.checkedIn) return fail('Not currently checked in');

  const gymUpdate = gymService._updateLiveGym(gymId, {
    currentOccupancy: Math.max(0, gymData.currentOccupancy - 1),
  });
  if (!gymUpdate.success) return fail(gymUpdate.message || 'Failed to update gym state');
  const updatedGym = gymUpdate.data;

  const updatedUser = storeUserState(userId, {
    checkedIn: false,
    checkInTime: null,
    lastCheckOutAt: new Date().toISOString(),
  });

  return ok('Check-out successful', 'success', { updatedGym, updatedUser });
}

export async function simulateNfcScenario(scenario, gymData, userData) {
  await delay(600);
  switch (scenario) {
    case 'success-checkin':
      return checkIn({
        gymId: gymData.gymId,
        userId: userData.userId,
        nfcPayload: EXPECTED_PAYLOAD,
      });
    case 'success-checkout':
      return checkOut({
        gymId: gymData.gymId,
        userId: userData.userId,
        nfcPayload: EXPECTED_PAYLOAD,
      });
    case 'invalid-nfc':
      return fail(
        `NFC verification failed — expected "${EXPECTED_PAYLOAD}" (invalid sticker)`,
      );
    case 'already-checkedin':
      return fail('Already checked in');
    case 'already-checkedout':
      return fail('Not currently checked in');
    default:
      return fail('Unknown error');
  }
}

// ---------- small helpers ----------

function preconditions({ gymId, userId, nfcPayload }) {
  if (!nfcPayload) return fail('NFC sticker was not read');
  if (nfcPayload !== EXPECTED_PAYLOAD) {
    return fail(
      `NFC verification failed — expected "${EXPECTED_PAYLOAD}" but got "${nfcPayload}"`,
    );
  }
  if (!gymId) return fail('Missing gymId');
  if (!userId) return fail('Missing user auth');
  return null;
}

async function loadGym(gymId) {
  const r = await gymService._fetchLiveGym(gymId);
  return r.success ? r.data : null;
}

function ok(message, type = 'success', extras = {}) {
  return { success: true, message, type, ...extras };
}
function fail(message, type = 'error') {
  return { success: false, message, type };
}

// Per-user in-memory check-in state mirror. Will live in MongoDB later.
let _userStates = {};
function loadUserState(userId) {
  return _userStates[userId] || { checkedIn: false, checkInTime: null, userId };
}
function storeUserState(userId, patch) {
  const next = { ...loadUserState(userId), ...patch, userId };
  _userStates[userId] = next;
  return next;
}

export const checkInService = {
  checkIn,
  checkOut,
  simulateNfcScenario,
};

export default checkInService;
