// ========== MOCK CHECK-IN HISTORY ==========
// FUTURE: GET /api/checkins  -> list of student gym visits
// Each row represents a real gym visit with actual check-in/check-out times.

const now = new Date();
const d = (daysAgo, h, m) => {
  const t = new Date(now);
  t.setDate(t.getDate() - daysAgo);
  t.setHours(h, m, 0, 0);
  return t;
};

const fmtTime = (date) =>
  date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const fmtDate = (date) =>
  date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const minutesBetween = (a, b) =>
  Math.max(0, Math.round((b.getTime() - a.getTime()) / 60000));

const makeVisit = (daysAgo, inH, inM, outH, outM, status = 'checkedOut') => {
  const ci = d(daysAgo, inH, inM);
  const co = status === 'checkedIn' ? null : d(daysAgo, outH, outM);
  const duration = co ? minutesBetween(ci, co) : null;
  return {
    id: `visit-${daysAgo}-${inH}${inM}`,
    userId: 'student-001',
    gymId: 'gym-001',
    gymName: 'Sejong University Gymnasium',
    dateLabel: fmtDate(ci),
    checkInTime: fmtTime(ci),
    checkOutTime: co ? fmtTime(co) : null,
    durationMinutes: duration,
    status,
    checkInAt: ci.toISOString(),
    checkOutAt: co ? co.toISOString() : null,
  };
};

export const initialCheckInHistory = [
  makeVisit(6, 8, 0, 9, 20),
  makeVisit(5, 19, 30, 20, 50),
  makeVisit(4, 13, 0, 14, 30),
  makeVisit(2, 7, 15, 8, 30),
  makeVisit(1, 18, 0, 19, 45),
];

export default initialCheckInHistory;
