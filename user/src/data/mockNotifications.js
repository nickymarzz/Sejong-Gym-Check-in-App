// ========== MOCK NOTIFICATIONS ==========
// FUTURE: Replace with Firebase Cloud Messaging via notificationService.

const now = Date.now();
const min = 60 * 1000;
const hr = 60 * min;

export const initialNotifications = [
  {
    id: 'n1',
    title: 'Gym is at 80% capacity',
    message: 'Come early if you want to use free weights today.',
    timestamp: now - 40 * min,
    read: false,
    type: 'capacity',
  },
  {
    id: 'n2',
    title: 'Welcome to SGC!',
    message: 'Your account is ready. Tap Check In to start your workout.',
    timestamp: now - 2 * hr,
    read: true,
    type: 'info',
  },
  {
    id: 'n3',
    title: 'Gym closing early today',
    message: 'The gym will close at 20:00 today due to maintenance.',
    timestamp: now - 26 * hr,
    read: true,
    type: 'alert',
  },
];

export default initialNotifications;
