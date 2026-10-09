import { CONFIG } from '../config';

// Mock implementations
import { authService as mockAuth } from './mock/authService';
import { gymService as mockGym } from './mock/gymService';
import { checkInService as mockCheckIn } from './mock/checkInService';
import { notificationService as mockNotification } from './mock/notificationService';

// Live API implementations
import { authService as apiAuth } from './api/authService';
import { gymService as apiGym } from './api/gymService';
import { checkInService as apiCheckIn } from './api/checkInService';
import { notificationService as apiNotification } from './api/notificationService';

export const authService = CONFIG.USE_MOCK ? mockAuth : apiAuth;
export const gymService = CONFIG.USE_MOCK ? mockGym : apiGym;
export const checkInService = CONFIG.USE_MOCK ? mockCheckIn : apiCheckIn;
export const notificationService = CONFIG.USE_MOCK ? mockNotification : apiNotification;

export { EXPECTED_PAYLOAD } from './api/checkInService';
export default {
  authService,
  gymService,
  checkInService,
  notificationService,
};
