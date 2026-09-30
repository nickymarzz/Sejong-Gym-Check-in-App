// ========== MOCK NOTIFICATION SERVICE ==========
// FUTURE REPLACEMENT:
// src/services/api/notificationService.js ->
//   Firebase Cloud Messaging (client-side receive handler)
//   GET    /api/notifications
//   POST   /api/notifications/:id/read

import { delay, uid } from './_utils';
import { initialNotifications } from '../../data/mockNotifications';

let list = [...initialNotifications];

async function getNotifications() {
  await delay(300);
  return { success: true, data: list.slice().sort((a, b) => b.timestamp - a.timestamp) };
}

async function markRead(notificationId) {
  await delay(150);
  list = list.map(n => (n.id === notificationId ? { ...n, read: true } : n));
  return { success: true };
}

async function markAllRead() {
  await delay(150);
  list = list.map(n => ({ ...n, read: true }));
  return { success: true };
}

async function unreadCount() {
  await delay(100);
  return { success: true, data: list.filter(n => !n.read).length };
}

// Helper used internally by checkInService to generate "push notifs"
export async function __pushNotification(item) {
  list = [{ id: uid('n'), timestamp: Date.now(), ...item }, ...list];
}

export const notificationService = {
  getNotifications,
  markRead,
  markAllRead,
  unreadCount,
};

export default notificationService;
