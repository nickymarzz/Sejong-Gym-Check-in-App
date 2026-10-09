import { apiRequest } from './client';

export async function getGymStatus(gymId = 'gym-001') {
  const res = await apiRequest(`/gym/status/${gymId}`, { method: 'GET' });
  if (res.success && res.data) {
    return { success: true, data: res.data };
  }
  return { success: false, message: res.message || 'Failed to fetch gym status' };
}

export async function getGyms() {
  const res = await apiRequest('/gyms', { method: 'GET' });
  if (res.success && res.data) {
    return { success: true, data: res.data };
  }
  return { success: false, message: res.message || 'Failed to fetch gyms' };
}

export const gymService = {
  getGymStatus,
  getGyms,
};

export default gymService;
