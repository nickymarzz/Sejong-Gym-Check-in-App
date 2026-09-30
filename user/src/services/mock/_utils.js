// Small helpers shared by all mock services.
export function delay(ms = 500) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
