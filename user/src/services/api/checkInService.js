import { apiRequest } from './client';

export const EXPECTED_PAYLOAD = 'SGC-GYM';

export async function checkIn({ gymId = 'gym-001', nfcPayload = EXPECTED_PAYLOAD } = {}) {
  const res = await apiRequest('/checkins', {
    method: 'POST',
    body: {
      gymId,
      nfcPayload,
    },
  });

  if (!res.success) {
    return {
      success: false,
      message: res.message || 'Check-in failed',
      type: 'error',
    };
  }

  return {
    success: true,
    message: res.message || 'Check-in successful',
    type: 'success',
    updatedGym: res.data?.updatedGym,
    updatedUser: res.data?.updatedUser,
    data: res.data,
  };
}

export async function checkOut({ gymId = 'gym-001', nfcPayload = EXPECTED_PAYLOAD } = {}) {
  const res = await apiRequest('/checkouts', {
    method: 'POST',
    body: {
      gymId,
      nfcPayload,
    },
  });

  if (!res.success) {
    return {
      success: false,
      message: res.message || 'Check-out failed',
      type: 'error',
    };
  }

  return {
    success: true,
    message: res.message || 'Check-out successful',
    type: 'success',
    updatedGym: res.data?.updatedGym,
    updatedUser: res.data?.updatedUser,
    data: res.data,
  };
}

export async function getHistory() {
  const res = await apiRequest('/checkins/history', { method: 'GET' });
  if (res.success && Array.isArray(res.data)) {
    const formatted = res.data.map(item => {
      const inDate = item.checkInTime ? new Date(item.checkInTime) : new Date();
      const outDate = item.checkOutTime ? new Date(item.checkOutTime) : null;
      return {
        id: item._id,
        gymName: item.gymName || 'Student Union Gym',
        dateLabel: inDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        checkInTime: inDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
        checkOutTime: outDate ? outDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : null,
        durationMinutes: item.durationMinutes || 0,
        status: item.status === 'completed' ? 'checkedOut' : (item.status === 'active' ? 'checkedIn' : 'missed'),
      };
    });
    return { success: true, data: formatted };
  }
  return { success: false, message: res.message || 'Failed to fetch history', data: [] };
}

export async function getActiveSession() {
  const res = await apiRequest('/checkins/active', { method: 'GET' });
  if (res.success) {
    return { success: true, data: res.data };
  }
  return { success: false, message: res.message };
}

export async function simulateNfcScenario(scenario, gymData, userData) {
  const gymId = gymData?.gymId || 'gym-001';

  switch (scenario) {
    case 'success-checkin':
      return await checkIn({ gymId, nfcPayload: EXPECTED_PAYLOAD });
    case 'success-checkout':
      return await checkOut({ gymId, nfcPayload: EXPECTED_PAYLOAD });
    case 'invalid-nfc':
      return await checkIn({ gymId, nfcPayload: 'INVALID-STICKER' });
    case 'already-checkedin':
      return await checkIn({ gymId, nfcPayload: EXPECTED_PAYLOAD });
    case 'already-checkedout':
      return await checkOut({ gymId, nfcPayload: EXPECTED_PAYLOAD });
    default:
      return { success: false, message: 'Unknown scenario', type: 'error' };
  }
}

export const checkInService = {
  checkIn,
  checkOut,
  getHistory,
  getActiveSession,
  simulateNfcScenario,
};

export default checkInService;
