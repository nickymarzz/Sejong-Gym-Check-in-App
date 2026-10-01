# 🗄️ Sejong Gym Check-in App — Database Layer

**Lead**: Zafri (Database, Security & QA Lead)  
**Database**: MongoDB (Local / Atlas)  
**Database Name**: `sejong_gym`

---

## 📖 Welcome, Zafri! (MongoDB Beginner Quickstart)

If you are new to MongoDB and databases, here is the easiest way to understand how it works compared to relational SQL:

| Concept | SQL Relational (MySQL / Postgres) | MongoDB (NoSQL) | Sejong Gym Example |
|---|---|---|---|
| **Container** | Database | Database | `sejong_gym` |
| **Table** | Table | **Collection** | `Users`, `CheckIns`, `Gyms`, `DailySummaries` |
| **Row / Record** | Row | **Document** (BSON / JSON format) | A single student's profile or single gym visit |
| **Column** | Column | **Field / Property** | `studentId`, `checkInTime`, `status` |
| **ID** | Primary Key (`id INT AUTO_INCREMENT`) | `_id` (`ObjectId`) | Auto-generated 12-byte hex ID |

---

## 🗂️ Collections & Schema Architecture

All collections are enforced with strict **`$jsonSchema` validation** and **optimized indexes**:

### 1. `Users`
Stores student and staff accounts.
- `userId` (String): e.g. `"student-001"`
- `studentId` (String): 8-digit Sejong ID (e.g. `"20241234"`) — **Unique Index**
- `name` (String): Full student name
- `email` (String): e.g. `"20241234@sejong.ac.kr"` — **Unique Index**
- `passwordHash` (String): Bcrypt hash (`$2y$10$...`) — never plaintext
- `role` (String): `"student"` or `"admin"`
- `department` (String): e.g. `"Department of Computer Engineering"`
- `year` (Number): 1–6
- `checkedIn` (Boolean): Quick cache flag for app status
- `checkInTime` (Date / Null)

### 2. `Gyms`
Stores physical gym configuration and live state.
- `gymId` (String): `"gym-001"` — **Unique Index**
- `gymName` (String): `"Sejong University Gymnasium"`
- `location` (String): `"Student Union Building B, 3F"`
- `capacity` (Number): `50`
- `currentOccupancy` (Number): e.g. `24`
- `status` (String): `"open"` | `"closed"` | `"maintenance"`
- `nfcTagIdentifier` (String): `"SGC-GYM"` (Passive sticker payload)
- `openingHours` (Object): `{ open: "06:00", close: "22:00" }`

### 3. `CheckIns`
Logs all gym visits triggered by passive NFC tap + JWT authentication.
- `userId` (String): Student ID reference
- `studentId` (String): 8-digit student ID
- `gymId` (String): `"gym-001"`
- `nfcPayload` (String): `"SGC-GYM"`
- `checkInTime` (Date): Check-in timestamp
- `checkOutTime` (Date / Null): Check-out timestamp
- `durationMinutes` (Number / Null): Total duration
- `status` (String): `"active"` (inside gym) or `"completed"` (checked out)

> 🛡️ **Zafri's Security Super-Power: Anti-Race Condition Unique Partial Index**  
> We have created an index on `{ studentId: 1 }` with `{ unique: true, partialFilterExpression: { status: "active" } }`.  
> Even if a student double-taps the NFC tag rapidly or an attacker fires concurrent requests, **MongoDB will reject the duplicate check-in at the database layer** (Error 11000).

### 4. `DailySummaries`
Aggregated daily metrics powering Javo's Admin Dashboard (Chart.js).
- `gymId` (String) & `date` (String YYYY-MM-DD) — **Compound Unique Index**
- `totalVisits`, `uniqueStudents`, `peakOccupancy`, `peakHour`, `averageDurationMinutes`
- `hourlyBreakdown`: Array of `{ hour, visits, occupancy }` for graphs

---

## 🚀 How to Run & Seed the Database

Open your terminal in the project root:

### 1. Initialize Collections & Indexes
```bash
mongosh sejong_gym database/init_db.js
```

### 2. Seed Realistic Test Data
```bash
mongosh sejong_gym database/seed.js
```
*Seeds:*
- Sejong Gymnasium (`gym-001`, capacity 50, occupancy 24).
- 28 Users (Demo student `20241234`, other students, and gym admin). All passwords default to `password` (hashed).
- 150+ Check-in records (including 24 active in-gym sessions).
- 7 days of daily analytics.

### 3. Run Security & Edge-Case Verification Tests
```bash
mongosh sejong_gym database/test_security.js
```
*Verifies:*
- Duplicate active check-ins are blocked by the database.
- Multiple completed visits are permitted.
- All passwords are encrypted with bcrypt.
- Invalid student ID formats are rejected by the schema.

### 4. Run Sample Inspection Queries
```bash
mongosh sejong_gym database/queries/sample_queries.js
```

---

## 🛠️ Handy `mongosh` Commands Cheatsheet for Zafri

To open the interactive MongoDB prompt:
```bash
mongosh sejong_gym
```

Inside `mongosh`:
```javascript
// 1. Show all collections
show collections

// 2. Count records in each collection
db.Users.countDocuments()
db.Gyms.countDocuments()
db.CheckIns.countDocuments()
db.CheckIns.countDocuments({ status: "active" }) // Count active students

// 3. Find the demo student
db.Users.findOne({ studentId: "20241234" })

// 4. View recent check-in history
db.CheckIns.find({ studentId: "20241234" }).sort({ checkInTime: -1 }).pretty()

// 5. Check gym status
db.Gyms.findOne({ gymId: "gym-001" })

// 6. Exit mongosh
exit
```

---

## 🤝 Coordination with the Team

- **For Nik (Backend & API Lead)**:
  - MongoDB connection URI: `mongodb://127.0.0.1:27017/sejong_gym`
  - In Laravel `.env`:
    ```ini
    DB_CONNECTION=mongodb
    MONGODB_URI="mongodb://127.0.0.1:27017/sejong_gym"
    MONGODB_DATABASE=sejong_gym
    ```
- **For Jedrek (Mobile App Lead)**:
  - Demo student `20241234` / `password` is seeded and matches mobile mock fixtures.
- **For Javo (Admin Dashboard Lead)**:
  - Admin user `00000001` / `password` (role: `"admin"`).
  - 7 days of `DailySummaries` with `hourlyBreakdown` are ready for Chart.js.
