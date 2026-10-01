/**
 * Sejong Gym Check-in App (SGC)
 * Handy MongoDB Cheatsheet & Sample Queries for Zafri
 * 
 * Usage:
 *   mongosh sejong_gym database/queries/sample_queries.js
 */

const targetDb = db.getSiblingDB('sejong_gym');

print(`\n======================================================`);
print(`  SGC MongoDB Cheatsheet & Inspection Queries`);
print(`======================================================\n`);

// 1. Check Live Occupancy
print(`--- [1] Current Live Gym Occupancy ---`);
const gym = targetDb.Gyms.findOne({ gymId: "gym-001" });
const liveCount = targetDb.CheckIns.countDocuments({ gymId: "gym-001", status: "active" });
print(`Gym: ${gym.gymName}`);
print(`Status: ${gym.status.toUpperCase()} | Capacity: ${liveCount} / ${gym.capacity} (${Math.round((liveCount / gym.capacity) * 100)}%)`);

// 2. List Currently Checked-in Students
print(`\n--- [2] First 5 Students Currently Inside the Gym ---`);
const activeStudents = targetDb.CheckIns.find({ status: "active" }).limit(5).toArray();
activeStudents.forEach((rec, idx) => {
  const mins = Math.round((new Date() - rec.checkInTime) / 60000);
  print(`  ${idx + 1}. Student ID: ${rec.studentId} | In for: ${mins} mins | Checked in at: ${rec.checkInTime.toLocaleTimeString()}`);
});

// 3. Demo User Check-In History
print(`\n--- [3] Demo Student (20241234) Visit History ---`);
const visits = targetDb.CheckIns.find({ studentId: "20241234" }).sort({ checkInTime: -1 }).toArray();
visits.forEach(v => {
  print(`  • Date: ${v.checkInTime.toISOString().slice(0, 10)} | In: ${v.checkInTime.toLocaleTimeString()} | Out: ${v.checkOutTime ? v.checkOutTime.toLocaleTimeString() : 'ACTIVE'} | Duration: ${v.durationMinutes} mins`);
});

// 4. Admin Daily Analytics (Peak Hours)
print(`\n--- [4] Past 3 Days Peak Occupancy Summary ---`);
const summaries = targetDb.DailySummaries.find().sort({ date: -1 }).limit(3).toArray();
summaries.forEach(s => {
  print(`  • Date: ${s.date} | Total Visits: ${s.totalVisits} | Peak: ${s.peakOccupancy} occupants (${s.peakHour})`);
});

print(`\n======================================================\n`);
