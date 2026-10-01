/**
 * Sejong Gym Check-in App (SGC)
 * Database Initialization Script
 * Lead: Zafri (Database, Security & QA Lead)
 * 
 * Usage:
 *   mongosh sejong_gym database/init_db.js
 */

const DB_NAME = 'sejong_gym';
const targetDb = db.getSiblingDB(DB_NAME);

print(`=======================================================`);
print(`  Initializing Sejong Gym Check-in App Database: ${DB_NAME}`);
print(`=======================================================`);

// Helper to create or update collection validator
function setupCollection(collName, validator) {
  const collections = targetDb.getCollectionNames();
  if (collections.includes(collName)) {
    print(`[INFO] Updating existing collection validator: ${collName}`);
    targetDb.runCommand({
      collMod: collName,
      validator: validator,
      validationLevel: 'moderate' // 'moderate' ensures existing docs won't break if slightly different
    });
  } else {
    print(`[INFO] Creating collection with schema validation: ${collName}`);
    targetDb.createCollection(collName, {
      validator: validator,
      validationLevel: 'strict',
      validationAction: 'error'
    });
  }
}

// 1. Setup Users Collection Validation
setupCollection('Users', {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "studentId", "name", "email", "passwordHash", "role"],
    properties: {
      userId: { bsonType: "string" },
      studentId: { bsonType: "string", pattern: "^[0-9]{8}$" },
      name: { bsonType: "string" },
      email: { bsonType: "string", pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$" },
      passwordHash: { bsonType: "string" },
      role: { enum: ["student", "admin", "staff"] },
      department: { bsonType: "string" },
      year: { bsonType: "number", minimum: 1, maximum: 6 },
      checkedIn: { bsonType: "bool" },
      checkInTime: { bsonType: ["date", "null"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" }
    }
  }
});

// 2. Setup Gyms Collection Validation
setupCollection('Gyms', {
  $jsonSchema: {
    bsonType: "object",
    required: ["gymId", "gymName", "location", "capacity", "currentOccupancy", "status", "nfcTagIdentifier"],
    properties: {
      gymId: { bsonType: "string" },
      gymName: { bsonType: "string" },
      location: { bsonType: "string" },
      capacity: { bsonType: "number", minimum: 1 },
      currentOccupancy: { bsonType: "number", minimum: 0 },
      status: { enum: ["open", "closed", "maintenance"] },
      nfcTagIdentifier: { bsonType: "string" },
      openingHours: {
        bsonType: "object",
        required: ["open", "close"],
        properties: {
          open: { bsonType: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$" },
          close: { bsonType: "string", pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]$" }
        }
      },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" }
    }
  }
});

// 3. Setup CheckIns Collection Validation
setupCollection('CheckIns', {
  $jsonSchema: {
    bsonType: "object",
    required: ["userId", "studentId", "gymId", "nfcPayload", "checkInTime", "status"],
    properties: {
      userId: { bsonType: "string" },
      studentId: { bsonType: "string", pattern: "^[0-9]{8}$" },
      gymId: { bsonType: "string" },
      gymName: { bsonType: "string" },
      nfcPayload: { bsonType: "string" },
      checkInTime: { bsonType: "date" },
      checkOutTime: { bsonType: ["date", "null"] },
      durationMinutes: { bsonType: ["number", "null"], minimum: 0 },
      status: { enum: ["active", "completed", "auto_expired"] },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" }
    }
  }
});

// 4. Setup DailySummaries Collection Validation
setupCollection('DailySummaries', {
  $jsonSchema: {
    bsonType: "object",
    required: ["gymId", "date", "totalVisits", "uniqueStudents", "peakOccupancy", "averageDurationMinutes"],
    properties: {
      gymId: { bsonType: "string" },
      date: { bsonType: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$" },
      totalVisits: { bsonType: "number", minimum: 0 },
      uniqueStudents: { bsonType: "number", minimum: 0 },
      peakOccupancy: { bsonType: "number", minimum: 0 },
      peakHour: { bsonType: "string" },
      averageDurationMinutes: { bsonType: "number", minimum: 0 },
      hourlyBreakdown: { bsonType: "array" },
      createdAt: { bsonType: "date" },
      updatedAt: { bsonType: "date" }
    }
  }
});

print(`\n[INFO] Creating Performance & Security Indexes...`);

// Users Indexes
targetDb.Users.createIndex({ studentId: 1 }, { unique: true, name: "uniq_student_id" });
targetDb.Users.createIndex({ email: 1 }, { unique: true, name: "uniq_email" });
targetDb.Users.createIndex({ role: 1 }, { name: "idx_role" });
print(`  ✓ Users indexes created (unique studentId, unique email, role)`);

// Gyms Indexes
targetDb.Gyms.createIndex({ gymId: 1 }, { unique: true, name: "uniq_gym_id" });
print(`  ✓ Gyms indexes created (unique gymId)`);

// CheckIns Indexes
// CRITICAL SECURITY INDEX: Prevents race-conditions and duplicate active check-ins for the same student
targetDb.CheckIns.createIndex(
  { studentId: 1 },
  { 
    unique: true, 
    partialFilterExpression: { status: "active" },
    name: "uniq_active_checkin_per_student" 
  }
);
targetDb.CheckIns.createIndex({ studentId: 1, checkInTime: -1 }, { name: "idx_student_history" });
targetDb.CheckIns.createIndex({ gymId: 1, status: 1 }, { name: "idx_gym_occupancy" });
targetDb.CheckIns.createIndex({ checkInTime: -1 }, { name: "idx_recent_checkins" });
print(`  ✓ CheckIns indexes created (including anti-duplicate partial unique index)`);

// DailySummaries Indexes
targetDb.DailySummaries.createIndex({ gymId: 1, date: 1 }, { unique: true, name: "uniq_gym_date_summary" });
targetDb.DailySummaries.createIndex({ date: -1 }, { name: "idx_summary_date" });
print(`  ✓ DailySummaries indexes created (unique gymId + date)`);

print(`\n[SUCCESS] Database '${DB_NAME}' schema and indexes initialized successfully!`);
