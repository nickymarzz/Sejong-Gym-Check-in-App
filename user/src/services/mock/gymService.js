// ========== MOCK GYM SERVICE ==========
// FUTURE REPLACEMENT:
// src/services/api/gymService.js ->
//   GET /api/gym/status      -> { gym data }
//   GET /api/gyms/:id        -> gym details

import { delay } from './_utils';
import { mainGym } from '../../data/mockGyms';

// In-memory mutable gym state for the prototype.
// Real backend is the source of truth — this mock mirrors what that server would return.
let liveGym = { ...mainGym };

async function getGymStatus(gymId = 'gym-001') {
  await delay(200);
  if (gymId !== liveGym.gymId) {
    return { success: false, message: 'Gym not found' };
  }
  return { success: true, data: { ...liveGym } };
}

// Internal: used by sibling checkInService after a check-in/out changes occupancy.
// NOT exported as a named export — exposed only via gymService._updateLiveGym so
// external consumers are discouraged from bypassing approved service methods.
//
// Scalable signature: gymId must match the in-memory gym that the patch targets.
// Prevents cross-gym state corruption when the mock grows past a single gym.
function updateLiveGym(gymId, patch) {
  if (!gymId) {
    return { success: false, message: 'gymId is required to update gym state' };
  }
  if (gymId !== liveGym.gymId) {
    return { success: false, message: `Gym ${gymId} not found` };
  }
  liveGym = { ...liveGym, ...patch };
  return { success: true, data: { ...liveGym } };
}

// Internal: used by sibling checkInService to get the current live gym mirror.
// Future equivalent: backend GET /api/gyms/:id/status.
async function fetchLiveGym(gymId = 'gym-001') {
  if (gymId !== liveGym.gymId) {
    return { success: false, message: 'Gym not found' };
  }
  return { success: true, data: { ...liveGym } };
}

export const gymService = {
  getGymStatus,
  _updateLiveGym: updateLiveGym,
  _fetchLiveGym: fetchLiveGym,
};

export default gymService;
