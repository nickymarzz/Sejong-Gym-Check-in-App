/**
 * Sejong Gym Check-in App (SGC)
 * Security & QA Edge Case Verification Script
 * Lead: Zafri (Database, Security & QA Lead)
 * 
 * Usage:
 *   mongosh sejong_gym database/test_security.js
 */

const DB_NAME = 'sejong_gym';
const targetDb = db.getSiblingDB(DB_NAME);

print(`\n=======================================================`);
print(`  Running Security & QA Edge-Case Tests (Zafri)`);
print(`=======================================================\n`);

let passedTests = 0;
let totalTests = 0;

function assert(description, fn) {
  totalTests++;
  try {
    fn();
    print(`  [PASS] Test #${totalTests}: ${description}`);
    passedTests++;
  } catch (err) {
    print(`  [FAIL] Test #${totalTests}: ${description}`);
    print(`         Error: ${err.message}`);
  }
}

// -------------------------------------------------------------
// Test 1: Active student cannot have two active check-in documents (Anti-Race Condition)
// -------------------------------------------------------------
assert("Database blocks duplicate active check-in (Partial Unique Index)", () => {
  const activeStudent = targetDb.CheckIns.findOne({ status: "active" });
  if (!activeStudent) throw new Error("No active student found in database.");

  let duplicateCaught = false;
  try {
    targetDb.CheckIns.insertOne({
      userId: activeStudent.userId,
      studentId: activeStudent.studentId,
      gymId: activeStudent.gymId,
      gymName: activeStudent.gymName,
      nfcPayload: "SGC-GYM",
      checkInTime: new Date(),
      checkOutTime: null,
      durationMinutes: null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (err) {
    if (err.code === 11000 || err.message.includes("E11000")) {
      duplicateCaught = true;
    } else {
      throw err;
    }
  }

  if (!duplicateCaught) {
    throw new Error("Failed: MongoDB allowed duplicate active check-in for the same student!");
  }
});

// -------------------------------------------------------------
// Test 2: Same student CAN have multiple completed check-in records
// -------------------------------------------------------------
assert("Student can have multiple completed check-in records in history", () => {
  const testStudentId = "20241234";
  const completedCount = targetDb.CheckIns.countDocuments({ studentId: testStudentId, status: "completed" });
  if (completedCount <= 1) {
    throw new Error(`Expected multiple completed visits for demo student, got: ${completedCount}`);
  }
});

// -------------------------------------------------------------
// Test 3: Password hash integrity check (All passwords stored as bcrypt)
// -------------------------------------------------------------
assert("All users have bcrypt-hashed passwords (No plaintext passwords stored)", () => {
  const plaintextUser = targetDb.Users.findOne({
    passwordHash: { $not: /^\$2[ayb]\$.{56}$/ }
  });
  if (plaintextUser) {
    throw new Error(`User ${plaintextUser.studentId} has non-bcrypt or plaintext password!`);
  }
});

// -------------------------------------------------------------
// Test 4: Schema validation prevents invalid student ID format
// -------------------------------------------------------------
assert("Schema validation blocks invalid student ID format (e.g. non-8-digit)", () => {
  let schemaErrorCaught = false;
  try {
    targetDb.Users.insertOne({
      userId: "invalid-user",
      studentId: "123", // Only 3 digits, schema requires ^[0-9]{8}$
      name: "Bad Student",
      email: "bad@sejong.ac.kr",
      passwordHash: "$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi",
      role: "student",
      createdAt: new Date(),
      updatedAt: new Date()
    });
  } catch (err) {
    schemaErrorCaught = true;
  }

  if (!schemaErrorCaught) {
    throw new Error("Failed: Schema allowed invalid 3-digit studentId!");
  }
});

print(`\n=======================================================`);
print(`  Results: ${passedTests}/${totalTests} tests passed.`);
print(`=======================================================\n`);
