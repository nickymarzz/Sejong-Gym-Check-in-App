import { apiRequest } from './client';

export async function getNotifications() {
  const res = await apiRequest('/notifications', { method: 'GET' });
  if (res.success && Array.isArray(res.data)) {
    const formatted = res.data.map(n => ({
      id: n.id,
      title: n.title,
      body: n.body,
      type: n.type || 'info',
      read: !!n.read,
      timestamp: n.timestamp ? new Date(n.timestamp).getTime() : Date.now(),
    }));
    return { success: true, data: formatted };
  }
  return { success: false, message: res.message || 'Failed to fetch notifications', data: [] };
}

export async function markRead(notificationId) {
  const res = await apiRequest(`/notifications/${notificationId}/read`, { method: 'POST' });
  return { success: res.success };
}

export async function markAllRead() {
  const res = await apiRequest('/notifications/read-all', { method: 'POST' });
  return { success: res.success };
}

export async function unreadCount() {
  const res = await apiRequest('/notifications/unread-count', { method: 'GET' });
  if (res.success && res.data?.unreadCount !== undefined) {
    return { success: true, data: res.data.unreadCount };
  }
  return { success: false, data: 0 };
}

export const notificationService = {
  getNotifications,
  markRead,
  markAllRead,
  unreadCount,
};

export default notificationService;
