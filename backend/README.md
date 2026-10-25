# ⚙️ Sejong Gym Check-in App — Backend API (`/backend`)

**Lead**: Nik (Backend Architecture & API Lead)  
**Framework**: Laravel 11 (PHP 8.5 NTS, x64)  
**Database**: MongoDB (`mongodb/laravel-mongodb` v5)  
**Cache / Queues**: Redis (`predis/predis`)  
**Authentication**: JSON Web Tokens (`tymon/jwt-auth`)  

---

## 📌 Overview

The `/backend` service is a high-performance REST API powering both the **Mobile Client** (Expo / React Native) and the **Admin Dashboard** (HTML/JS/Chart.js). It manages real-time gym occupancy, secure student NFC check-ins/check-outs, facility operating hours enforcement, and asynchronous background queues for analytics and notifications.

Designed specifically to run efficiently on Windows without requiring heavy monolithic stacks like XAMPP, the backend relies on standalone PHP 8.5, local MongoDB, and local Redis.

---

## 🚀 Key Architectural Features

### 1. Robust NFC Check-in & Concurrency Control

- **Passive Sticker Authentication**: Validates static NFC payloads (`"SGC-GYM"`) paired with student JWT bearer tokens.
- **Race Condition Prevention**: Enforces a MongoDB partial unique index on `{ studentId: 1 }` where `{ status: "active" }`, preventing rapid double-taps from generating duplicate check-ins at the database layer.
- **Atomic Occupancy Tracking**: Incrementing and decrementing gym capacity is executed with atomic database operators (`$inc`) to prevent race conditions during peak hours.

### 2. Operating Hours & Auto-Checkout System

- **Schedule Enforcement**: The gym operates between **06:00 — 22:00 KST (`Asia/Seoul`)**. Any check-in attempts outside operating hours are rejected with HTTP 409 (`"Gym is currently closed. Operating hours are 06:00 — 22:00."`).
- **Scheduled Auto-Checkout**: At 22:00 daily, a scheduled artisan command (`php artisan sgc:auto-checkout gym-001`) automatically checks out any remaining active occupants with `status = "auto_expired"`.
- **Self-Healing Check-in**: If a student forgets to check out and returns on a subsequent day, the system automatically resolves their stale session before logging their new visit.
- **Admin Manual Checkout**: Gym staff can manually check out individual students or trigger bulk checkouts directly from the Admin Dashboard.

### 3. Asynchronous Queue Architecture (Redis)

- High-latency tasks are offloaded to background Redis queues so NFC taps and check-in API responses remain ultra-fast (< 50ms):
  - **`notifications` queue**: Dispatches Firebase Cloud Messaging (FCM) push notifications when occupancy crosses capacity thresholds.
  - **`analytics` queue**: Dynamically aggregates hourly and daily summaries (`DailySummaries` collection) for dashboard charts without locking the check-in table.

### 4. Role-Based Access Control (RBAC)

- Token-based authorization via `tymon/jwt-auth`.
- Custom `EnsureStaffRole` middleware guards all `/api/dashboard/*` endpoints, allowing access only to users with role `admin` or `staff`.

### 5. Automated End-to-End (E2E) Test Suite

- Comprehensive automated test runner (`storage/app/e2e_test.php`) verifying:
  - Authentication (Student & Admin login, rejection of invalid credentials)
  - Facility status and public capacity queries
  - NFC check-in and check-out flows
  - Double check-in prevention (409 Conflict)
  - Operating hours rejection and admin dashboard metrics

---

## 🛠️ Environment & Setup

Local runners are provided in the `/scripts` directory for PowerShell:

### 1. One-Time PHP & MongoDB Extension Setup

Installs the matching `ext-mongodb` DLL and configures project-local INI overrides in `backend/php-conf.d/`:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup_new_php.ps1
```

### 2. Reset and Seed Deterministic Database

Drops stale data, applies `$jsonSchema` validation and indexes, and seeds 28 users, gym configuration, and 150+ realistic check-in records:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed_db.ps1
```

### 3. Start the API Dev Server

Binds to `0.0.0.0:8000` so mobile phones running Expo Go on the local Wi-Fi can connect seamlessly:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_api.ps1
# Optional: specify a custom port, e.g. .\scripts\start_api.ps1 8022
```

### 4. Start Background Queue Workers (Optional)

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start_workers.ps1 notifications
powershell -ExecutionPolicy Bypass -File .\scripts\start_workers.ps1 analytics
```

### 5. Run the Automated E2E Test Suite

Runs all 18 automated HTTP contract tests against the running server:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run_tests_e2e.ps1
```

### 6. Auto-Checkout Artisan Commands

```powershell
# Manually run auto-checkout for a specific gym:
php backend/artisan sgc:auto-checkout gym-001

# Run the scheduled tasks worker (closing hours trigger at 22:00):
php backend/artisan schedule:work
```

---

## 📁 Directory Structure

```text
backend/
├── app/
│   ├── Console/
│   │   ├── Commands/
│   │   │   ├── AutoCheckoutCommand.php # Daily closing auto-checkout CLI
│   │   │   └── SeedDatabaseCommand.php # Comprehensive DB seeder
│   │   └── Kernel.php                  # Schedule definitions (22:00 checkout)
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthController.php      # Student & Admin authentication
│   │   │   ├── CheckInController.php   # NFC check-in, check-out, history, hours
│   │   │   ├── DashboardController.php # Staff metrics, active sessions, settings
│   │   │   ├── GymController.php       # Live occupancy & public capacity
│   │   │   └── NotificationController.php # Student alerts & unread badges
│   │   ├── Middleware/
│   │   │   └── EnsureStaffRole.php     # RBAC protection for admin endpoints
│   │   └── Requests/                   # Validation form requests (UpdateGym, etc.)
│   ├── Jobs/                           # Redis queued jobs (Analytics, FCM)
│   └── Models/                         # MongoDB Eloquent Models
│       ├── CheckIn.php
│       ├── DailySummary.php
│       ├── Gym.php
│       ├── Notification.php
│       └── User.php
├── config/                             # Laravel configurations (auth, database, queue)
├── php-conf.d/                         # Local extension overrides (ext-mongodb)
├── routes/
│   ├── api.php                         # REST API endpoint routes
│   └── console.php                     # Console commands & schedule registrations
└── storage/app/
    └── e2e_test.php                    # Automated E2E test runner
```

---

## 📡 REST API Reference

All routes are served at `http://<host>:8000/api` with JSON request/response bodies:

### Authentication

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/login` | Public | Student/Admin login (`studentId`, `password`) → returns JWT token |
| `POST` | `/api/auth/refresh` | Bearer JWT | Refreshes expired JWT token |
| `POST` | `/api/auth/logout` | Bearer JWT | Invalidates current JWT token |
| `GET` | `/api/auth/me` | Bearer JWT | Returns current authenticated profile |

### Facility & Live Occupancy

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/gym/status/{gymId}` | Public | Live occupancy, capacity percentage, status, and operating hours |

### Check-in & Workout History

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/checkin` | Bearer JWT | Tap to check in (`gymId`, `nfcPayload`) — enforces operating hours |
| `POST` | `/api/checkout` | Bearer JWT | Tap to check out (`gymId`, `nfcPayload`) |
| `GET` | `/api/checkin/active` | Bearer JWT | Returns current active workout session for logged-in student |
| `GET` | `/api/checkin/history` | Bearer JWT | Paginated workout visit history with duration and timestamps |

### Admin Dashboard (Requires `admin` or `staff` role)

| Method | Endpoint | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/gyms/{gymId}/summary/{date}` | Admin JWT | Day detail stats and hourly breakdown |
| `GET` | `/api/dashboard/gyms/{gymId}/weekly` | Admin JWT | Last 7 days metrics for chart widgets |
| `GET` | `/api/dashboard/gyms/{gymId}/active` | Admin JWT | List all students currently inside with duration |
| `PATCH` | `/api/dashboard/gyms/{gymId}/settings` | Admin JWT | Update capacity, operating status, or hours |
| `POST` | `/api/dashboard/gyms/{gymId}/active/{userId}/checkout` | Admin JWT | Staff force checkout for an individual student |
| `POST` | `/api/dashboard/gyms/{gymId}/checkout-all` | Admin JWT | Staff force checkout for all current occupants |

---

## 🔑 Demo Credentials

- **Student ID:** `20241234` | **Password:** `password`
- **Admin ID:** `00000001` | **Password:** `password`
