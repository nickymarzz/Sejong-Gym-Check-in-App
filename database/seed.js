/**
 * Sejong Gym Check-in App (SGC)
 * Database Seeder Script
 * Lead: Zafri (Database, Security & QA Lead)
 * 
 * Usage:
 *   mongosh sejong_gym database/seed.js
 * 
 * This script seeds realistic data for:
 *   1. Gyms (Sejong University Gymnasium, capacity 50)
 *   2. Users (Students + Gym Admin with bcrypt-hashed passwords)
 *   3. CheckIns (Historical records + currently active gym occupants)
 *   4. DailySummaries (7-day analytics for Admin Chart.js dashboard)
 */

const DB_NAME = 'sejong_gym';
const targetDb = db.getSiblingDB(DB_NAME);

print(`\n=======================================================`);
print(`  Seeding Sejong Gym Check-in App Database: ${DB_NAME}`);
print(`=======================================================\n`);

const now = new Date();

// Helper to compute date offset
function daysAgo(days, hours = 10, minutes = 0) {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function minutesAgo(mins) {
  return new Date(now.getTime() - mins * 60 * 1000);
}

// Laravel / Sanctum default bcrypt hash for plain string: 'password'
const DEFAULT_PASSWORD_HASH = "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi";

// ------------------------------------------------------------------
// 1. CLEAR EXISTING DATA (Clean slate for seeding)
// ------------------------------------------------------------------
print(`[1/5] Clearing existing collections...`);
targetDb.Users.deleteMany({});
targetDb.Gyms.deleteMany({});
targetDb.CheckIns.deleteMany({});
targetDb.DailySummaries.deleteMany({});
print(`  ✓ Cleaned collections: Users, Gyms, CheckIns, DailySummaries`);

// ------------------------------------------------------------------
// 2. SEED GYMS
// ------------------------------------------------------------------
print(`\n[2/5] Seeding Gyms...`);
const gymData = {
  gymId: "gym-001",
  gymName: "Sejong University Gymnasium",
  location: "Student Union Building B, 3F",
  capacity: 50,
  currentOccupancy: 24, // Matches 24 active student check-ins below
  status: "open",
  nfcTagIdentifier: "SGC-GYM",
  openingHours: {
    open: "06:00",
    close: "22:00"
  },
  createdAt: daysAgo(30, 8, 0),
  updatedAt: now
};

targetDb.Gyms.insertOne(gymData);
print(`  ✓ Seeded Gym: '${gymData.gymName}' (Capacity: ${gymData.capacity}, NFC Tag: '${gymData.nfcTagIdentifier}')`);

// ------------------------------------------------------------------
// 3. SEED USERS (Students + Admin)
// ------------------------------------------------------------------
print(`\n[3/5] Seeding Users (Students & Admin)...`);

const usersList = [
  // Demo Student from the Mobile App Prototype
  {
    userId: "student-001",
    studentId: "20241234",
    name: "Demo Student",
    email: "20241234@sejong.ac.kr",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "student",
    department: "Department of Computer Engineering",
    year: 2,
    checkedIn: false,
    checkInTime: null,
    createdAt: daysAgo(20),
    updatedAt: now
  },
  // Currently Active in Gym Student 1
  {
    userId: "student-002",
    studentId: "20245678",
    name: "Min-Jun Kim",
    email: "20245678@sejong.ac.kr",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "student",
    department: "Software Engineering",
    year: 3,
    checkedIn: true,
    checkInTime: minutesAgo(48),
    createdAt: daysAgo(15),
    updatedAt: now
  },
  // Active in Gym Student 2
  {
    userId: "student-003",
    studentId: "20231122",
    name: "Seo-Yeon Lee",
    email: "20231122@sejong.ac.kr",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "student",
    department: "Digital Content",
    year: 4,
    checkedIn: true,
    checkInTime: minutesAgo(32),
    createdAt: daysAgo(25),
    updatedAt: now
  },
  // Inactive Student
  {
    userId: "student-004",
    studentId: "20249988",
    name: "Ji-Hoon Park",
    email: "20249988@sejong.ac.kr",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "student",
    department: "Physical Education",
    year: 1,
    checkedIn: false,
    checkInTime: null,
    createdAt: daysAgo(10),
    updatedAt: now
  },
  // Inactive Student
  {
    userId: "student-005",
    studentId: "20224433",
    name: "Ha-Eun Jung",
    email: "20224433@sejong.ac.kr",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "student",
    department: "Mechanical Engineering",
    year: 3,
    checkedIn: false,
    checkInTime: null,
    createdAt: daysAgo(18),
    updatedAt: now
  },
  // Admin / Staff User for Javo's Admin Dashboard
  {
    userId: "admin-001",
    studentId: "00000001",
    name: "Gym Staff Admin",
    email: "admin@sejong.ac.kr",
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "admin",
    department: "Campus Athletic Facilities & Management",
    year: 4,
    checkedIn: false,
    checkInTime: null,
    createdAt: daysAgo(40),
    updatedAt: now
  }
];

// Add 22 more active student records so the gym occupancy is exactly 24 (22 generated + student-002 + student-003)
for (let i = 6; i <= 27; i++) {
  const paddedId = String(20240000 + i);
  const isCheckedIn = true; // All 22 students checked in -> 22 + 2 = 24 active!
  const minutesIn = Math.floor(10 + Math.random() * 80);

  usersList.push({
    userId: `student-0${i < 10 ? '0' + i : i}`,
    studentId: paddedId,
    name: `Student ${paddedId}`,
    email: `${paddedId}@sejong.ac.kr`,
    passwordHash: DEFAULT_PASSWORD_HASH,
    role: "student",
    department: i % 2 === 0 ? "Artificial Intelligence" : "Business Administration",
    year: (i % 4) + 1,
    checkedIn: isCheckedIn,
    checkInTime: isCheckedIn ? minutesAgo(minutesIn) : null,
    createdAt: daysAgo(14),
    updatedAt: now
  });
}

targetDb.Users.insertMany(usersList);
print(`  ✓ Seeded ${usersList.length} users (students + admin)`);

// ------------------------------------------------------------------
// 4. SEED CHECK-INS
// ------------------------------------------------------------------
print(`\n[4/5] Seeding CheckIns (History + Active Sessions)...`);

const checkInsList = [];

// A. Demo Student (20241234) Historical Visits (Matching mockCheckInHistory.js)
const demoStudentVisits = [
  { days: 6, inH: 8, inM: 0, outH: 9, outM: 20 },
  { days: 5, inH: 19, inM: 30, outH: 20, outM: 50 },
  { days: 4, inH: 13, inM: 0, outH: 14, outM: 30 },
  { days: 2, inH: 7, inM: 15, outH: 8, outM: 30 },
  { days: 1, inH: 18, inM: 0, outH: 19, outM: 45 },
];

demoStudentVisits.forEach((v) => {
  const ciTime = daysAgo(v.days, v.inH, v.inM);
  const coTime = daysAgo(v.days, v.outH, v.outM);
  const dur = Math.round((coTime.getTime() - ciTime.getTime()) / 60000);

  checkInsList.push({
    userId: "student-001",
    studentId: "20241234",
    gymId: "gym-001",
    gymName: "Sejong University Gymnasium",
    nfcPayload: "SGC-GYM",
    checkInTime: ciTime,
    checkOutTime: coTime,
    durationMinutes: dur,
    status: "completed",
    createdAt: ciTime,
    updatedAt: coTime
  });
});

// B. Active Check-ins currently inside the gym (24 total active occupants)
const activeUsers = usersList.filter(u => u.checkedIn);
activeUsers.forEach(u => {
  checkInsList.push({
    userId: u.userId,
    studentId: u.studentId,
    gymId: "gym-001",
    gymName: "Sejong University Gymnasium",
    nfcPayload: "SGC-GYM",
    checkInTime: u.checkInTime,
    checkOutTime: null,
    durationMinutes: null,
    status: "active",
    createdAt: u.checkInTime,
    updatedAt: now
  });
});

// C. Random completed history over the last 7 days for other students
for (let d = 7; d >= 1; d--) {
  const visitCount = 15 + Math.floor(Math.random() * 10);
  for (let k = 0; k < visitCount; k++) {
    const student = usersList[k % usersList.length];
    if (student.role === 'admin' || student.studentId === '20241234') continue;

    const startH = 8 + Math.floor(Math.random() * 12);
    const startM = Math.floor(Math.random() * 60);
    const ciTime = daysAgo(d, startH, startM);
    const durMins = 35 + Math.floor(Math.random() * 75);
    const coTime = new Date(ciTime.getTime() + durMins * 60 * 1000);

    checkInsList.push({
      userId: student.userId,
      studentId: student.studentId,
      gymId: "gym-001",
      gymName: "Sejong University Gymnasium",
      nfcPayload: "SGC-GYM",
      checkInTime: ciTime,
      checkOutTime: coTime,
      durationMinutes: durMins,
      status: "completed",
      createdAt: ciTime,
      updatedAt: coTime
    });
  }
}

targetDb.CheckIns.insertMany(checkInsList);
print(`  ✓ Seeded ${checkInsList.length} check-in records (${activeUsers.length} currently active, ${checkInsList.length - activeUsers.length} completed)`);

// ------------------------------------------------------------------
// 5. SEED DAILY SUMMARIES (For Admin Analytics / Chart.js)
// ------------------------------------------------------------------
print(`\n[5/5] Seeding DailySummaries (Admin Analytics)...`);

const dailySummaries = [];
for (let d = 7; d >= 1; d--) {
  const targetDate = daysAgo(d);
  const dateStr = targetDate.toISOString().slice(0, 10); // YYYY-MM-DD

  // Generate hourly breakdown
  const hours = [
    { hour: "06:00", visits: 4, occupancy: 4 },
    { hour: "08:00", visits: 12, occupancy: 10 },
    { hour: "10:00", visits: 18, occupancy: 16 },
    { hour: "12:00", visits: 24, occupancy: 22 },
    { hour: "14:00", visits: 20, occupancy: 18 },
    { hour: "16:00", visits: 32, occupancy: 28 },
    { hour: "18:00", visits: 46, occupancy: 42 }, // Peak
    { hour: "20:00", visits: 30, occupancy: 26 },
  ];

  const totalVisits = hours.reduce((sum, h) => sum + h.visits, 0);
  const peakOccupancy = Math.max(...hours.map(h => h.occupancy));

  dailySummaries.push({
    gymId: "gym-001",
    date: dateStr,
    totalVisits: totalVisits,
    uniqueStudents: Math.round(totalVisits * 0.85),
    peakOccupancy: peakOccupancy,
    peakHour: "18:00 - 19:00",
    averageDurationMinutes: 65,
    hourlyBreakdown: hours,
    createdAt: targetDate,
    updatedAt: targetDate
  });
}

targetDb.DailySummaries.insertMany(dailySummaries);
print(`  ✓ Seeded ${dailySummaries.length} daily summary analytics records`);

// ------------------------------------------------------------------
// VERIFICATION & SUMMARY REPORT
// ------------------------------------------------------------------
print(`\n=======================================================`);
print(`  Verification Report for Zafri (Database Lead)`);
print(`=======================================================`);
const userCount = targetDb.Users.countDocuments();
const gymCount = targetDb.Gyms.countDocuments();
const checkInCount = targetDb.CheckIns.countDocuments();
const activeCheckInCount = targetDb.CheckIns.countDocuments({ status: "active" });
const summaryCount = targetDb.DailySummaries.countDocuments();

print(`  Total Users:            ${userCount}`);
print(`  Gym Facilities:         ${gymCount}`);
print(`  Total Check-in Records: ${checkInCount}`);
print(`  Active In-Gym Students: ${activeCheckInCount}`);
print(`  Daily Summaries:        ${summaryCount}`);

print(`\n[TEST] Sample Demo Student (20241234):`);
const sampleUser = targetDb.Users.findOne({ studentId: "20241234" }, { name: 1, department: 1, role: 1 });
print(JSON.stringify(sampleUser, null, 2));

print(`\n[TEST] Active Gym Occupancy Check:`);
const currentGym = targetDb.Gyms.findOne({ gymId: "gym-001" }, { gymName: 1, currentOccupancy: 1, capacity: 1 });
print(`  Gym: ${currentGym.gymName}`);
print(`  Occupancy Gauge: ${currentGym.currentOccupancy} / ${currentGym.capacity}`);
print(`  Matches Active DB Check-ins: ${currentGym.currentOccupancy === activeCheckInCount ? 'YES (VERIFIED)' : 'MISMATCH'}`);

print(`\n[SUCCESS] Database seeding completed cleanly!\n`);
