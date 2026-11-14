# 📖 Sejong Gym Check-in App (SGC) — REST API Documentation

**Author & Lead**: Nik (Backend & API Lead, Student ID: 24012935)  
**Deliverable**: Core REST API Specification (Proposal Section 6 & Table 1.1)  
**Framework**: Laravel 11 / PHP 8.5 (NTS)  
**Database**: MongoDB 7.0+ (`mongodb/laravel-mongodb`)  
**Cache & Queues**: Redis (`predis/predis`)  
**Security & Auth**: JSON Web Tokens (`tymon/jwt-auth`) & Form Request Validation  

---

## 1. Architectural Overview & Security

The Sejong Gym Check-in (SGC) API is a RESTful backend service built to power the student mobile application (React Native / Expo) and the gym facility admin dashboard.

### 1.1 Base URL

```text
Development (Local):  http://127.0.0.1:8000/api
Mobile Expo LAN:      http://<YOUR_LOCAL_IP>:8000/api
```

### 1.2 Authentication Flow

- All protected endpoints require a valid JSON Web Token (JWT) passed in the `Authorization` HTTP header:

  ```http
  Authorization: Bearer <jwt_access_token>
  ```

- Public endpoints (`/api/auth/login`, `/api/auth/register`, `/api/capacity`, `/api/gym/status`, `/api/gyms`) do not require tokens.
- Admin dashboard endpoints (`/api/dashboard/*`) require a token with `role` equal to `admin` or `staff`.

### 1.3 Rate Limiting & Abuse Prevention

To prevent brute-forcing and NFC tap flooding, the API enforces standard Laravel `throttle` rate limits:

- **Authentication endpoints (`/api/auth/*`)**: `30 requests / minute` per IP.
- **Check-in & checkout endpoints (`/api/checkins/*`)**: `60 requests / minute` per IP / student.
- Exceeding limits returns HTTP `429 Too Many Requests`.

### 1.4 NFC Security Verification

When checking in or checking out, the client app sends the scanned NFC payload alongside the user's JWT. The server asserts:

1. The student is logged in with an active JWT token.
2. The scanned `nfcPayload` strictly equals `"SGC-GYM"`.
3. The facility is currently within operating hours (06:00 – 22:00 KST).
4. The gym is not at full capacity (`currentOccupancy < capacity`).

---

## 2. API Endpoints Reference

### 2.1 Authentication & Profiles (FR-1)

#### `POST /api/auth/register`

Registers a new student account and returns an initial JWT authentication token.

- **Access**: Public (Throttled: 30/min)
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:

  ```json
  {
    "studentId": "20249876",
    "name": "Jane Kim",
    "email": "janekim@sejong.ac.kr",
    "password": "securePassword123",
    "department": "Software Engineering",
    "year": 2
  }
  ```

- **Response `201 Created`**:

  ```json
  {
    "status": "success",
    "message": "Registration successful.",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "userId": "student-20249876",
        "studentId": "20249876",
        "name": "Jane Kim",
        "email": "janekim@sejong.ac.kr",
        "role": "student",
        "department": "Software Engineering",
        "year": 2,
        "checkedIn": false,
        "checkInTime": null
      }
    }
  }
  ```

#### `POST /api/auth/login`

Authenticates a student or administrator using their 8-digit student ID and password.

- **Access**: Public (Throttled: 30/min)
- **Request Body**:

  ```json
  {
    "studentId": "20241234",
    "password": "password"
  }
  ```

- **Response `200 OK`**:

  ```json
  {
    "status": "success",
    "message": "Login successful.",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "userId": "student-001",
        "studentId": "20241234",
        "name": "Demo Student",
        "email": "20241234@sejong.ac.kr",
        "role": "student",
        "department": "Computer Science",
        "year": 3,
        "checkedIn": false,
        "checkInTime": null
      }
    }
  }
  ```

#### `GET /api/auth/me`

Retrieves the profile of the currently authenticated user.

- **Access**: Bearer JWT
- **Response `200 OK`**:

  ```json
  {
    "status": "success",
    "message": "User retrieved.",
    "data": {
      "userId": "student-001",
      "studentId": "20241234",
      "name": "Demo Student",
      "email": "20241234@sejong.ac.kr",
      "role": "student",
      "department": "Computer Science",
      "year": 3,
      "checkedIn": false,
      "checkInTime": null
    }
  }
  ```

#### `POST /api/auth/refresh`

Refreshes an expiring JWT token and returns a new valid token.

- **Access**: Bearer JWT
- **Response `200 OK`**: Returns refreshed JWT string.

#### `POST /api/auth/logout`

Invalidates the current JWT token in the blacklist.

- **Access**: Bearer JWT
- **Response `200 OK`**: `{"status": "success", "message": "Logged out successfully."}`

---

### 2.2 User Profile Management (`/api/users`)

#### `GET /api/users/profile`

Detailed profile retrieval for the authenticated user, including notification token status.

- **Access**: Bearer JWT
- **Response `200 OK`**:

  ```json
  {
    "status": "success",
    "message": "User profile retrieved.",
    "data": {
      "userId": "student-001",
      "studentId": "20241234",
      "name": "Demo Student",
      "email": "20241234@sejong.ac.kr",
      "role": "student",
      "department": "Computer Science",
      "year": 3,
      "checkedIn": false,
      "checkInTime": null,
      "hasFcmToken": true
    }
  }
  ```

#### `PATCH /api/users/profile`

Updates profile details or registers a Firebase Cloud Messaging (FCM) device token.

- **Access**: Bearer JWT
- **Request Body**:

  ```json
  {
    "department": "Software Engineering",
    "year": 4,
    "fcmToken": "fK1...sample...FCM...token"
  }
  ```

- **Response `200 OK`**:

  ```json
  {
    "status": "success",
    "message": "Profile updated successfully.",
    "data": { ... }
  }
  ```

---

### 2.3 Gym Capacity & Facility Monitoring (FR-4 & Proposal Sec 6)

#### `GET /api/capacity` or `GET /api/capacity/{gymId}`

Returns live occupancy counts and facility capacity metrics.

- **Access**: Public
- **Alias Routes**: `/api/gym/status`, `/api/gym/status/{gymId}`
- **Response `200 OK`**:

  ```json
  {
    "status": "success",
    "message": "Gym status retrieved.",
    "data": {
      "gymId": "gym-001",
      "gymName": "Sejong University Gymnasium",
      "location": "Student Union Building B, 3F",
      "capacity": 50,
      "currentOccupancy": 24,
      "status": "open",
      "nfcTagIdentifier": "SGC-GYM",
      "openingHours": {
        "open": "06:00",
        "close": "22:00"
      }
    }
  }
  ```

#### `GET /api/gym/status/stream`

Server-Sent Events (SSE) streaming endpoint delivering real-time occupancy updates to client apps with 0 latency.

- **Access**: Public
- **Content-Type**: `text/event-stream`

---

### 2.4 NFC Check-in & Workout Sessions (FR-2)

#### `POST /api/checkins`

Processes an NFC scan to start an active gym workout session.

- **Access**: Bearer JWT (Throttled: 60/min)
- **Request Body**:

  ```json
  {
    "gymId": "gym-001",
    "nfcPayload": "SGC-GYM"
  }
  ```

- **Response `201 Created`**:

  ```json
  {
    "status": "success",
    "message": "Check-in successful.",
    "data": {
      "type": "success",
      "updatedGym": {
        "gymId": "gym-001",
        "capacity": 50,
        "currentOccupancy": 25,
        "status": "open"
      },
      "updatedUser": {
        "userId": "student-001",
        "checkedIn": true,
        "checkInTime": "2026-11-07T16:50:00+09:00"
      },
      "checkIn": {
        "_id": "6724fa1b...",
        "gymId": "gym-001",
        "checkInTime": "2026-11-07T16:50:00+09:00",
        "status": "active"
      }
    }
  }
  ```

- **Error Responses**:
  - `409 Conflict`: Already checked in or facility is at 100% capacity.
  - `409 Conflict`: Facility closed outside 06:00 – 22:00 operating hours.
  - `422 Unprocessable Entity`: Invalid NFC tag string.

#### `POST /api/checkins/checkout`

Processes an NFC scan to conclude an active gym session.

- **Access**: Bearer JWT (Throttled: 60/min)
- **Request Body**:

  ```json
  {
    "gymId": "gym-001",
    "nfcPayload": "SGC-GYM"
  }
  ```

- **Response `200 OK`**:

  ```json
  {
    "status": "success",
    "message": "Check-out successful.",
    "data": {
      "type": "success",
      "updatedGym": {
        "currentOccupancy": 24
      },
      "updatedUser": {
        "checkedIn": false
      },
      "checkIn": {
        "durationMinutes": 62,
        "status": "completed"
      }
    }
  }
  ```

#### `GET /api/checkins/active`

Returns the current active workout session for the authenticated user.

- **Access**: Bearer JWT
- **Response `200 OK`**: Active check-in record or `null` data if not in gym.

#### `GET /api/checkins/history`

Returns paginated workout history for the logged-in student.

- **Access**: Bearer JWT
- **Query Params**: `?page=1&perPage=15`

---

### 2.5 Admin Dashboard Endpoints (FR-4)

*All routes in this group require `admin` or `staff` role in the JWT token.*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/dashboard/gyms/{gymId}/weekly` | Last 7 days metrics for Chart.js widgets |
| `GET` | `/api/dashboard/gyms/{gymId}/summary/{date}` | Hourly visit breakdowns for a specific date (`YYYY-MM-DD`) |
| `GET` | `/api/dashboard/gyms/{gymId}/active` | Real-time list of all students currently inside facility |
| `PATCH` | `/api/dashboard/gyms/{gymId}/settings` | Update max capacity, open/closed status, or operating hours |
| `POST` | `/api/dashboard/gyms/{gymId}/active/{userId}/checkout` | Force checkout an individual student |
| `POST` | `/api/dashboard/gyms/{gymId}/checkout-all` | Emergency bulk checkout for all active students |

---

## 3. Automated Test Verification (PHPUnit)

Nik has developed and maintained the automated PHPUnit test suite covering authentication, check-ins, capacity limits, and dashboard access:

```powershell
# Run the complete test suite (22 tests, 84 assertions):
powershell -ExecutionPolicy Bypass -File .\scripts\run_phpunit.ps1
```
