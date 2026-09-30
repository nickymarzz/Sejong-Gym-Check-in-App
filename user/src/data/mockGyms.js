// ========== MOCK GYMS ==========
// FUTURE: Replace with GET /api/gyms → array of gyms
//         GET /api/gyms/:id/status → live occupancy + status

export const mainGym = {
  gymId: 'gym-001',
  gymName: 'Sejong University Gymnasium',
  location: 'Student Union Building B, 3F',
  capacity: 50,
  currentOccupancy: 24,
  status: 'open', // open | closed | maintenance
  openingHours: {
    open: '06:00',
    close: '22:00',
  },
};

export default mainGym;
