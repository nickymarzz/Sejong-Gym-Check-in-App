# Backend Integration Update Log

**To the team (Jedrek, Javo, and others):**

We have successfully integrated the Laravel 11 Backend API for the Sejong Gym Check-in (SGC) system. This completely replaces the previous mock backend and establishes a production-ready foundation with real concurrency handling.

Here is a summary of what was accomplished and how it impacts your modules:

## What We Did

1. **Laravel 11 Backend Scaffolded (`/backend`)**: Full API built using PHP 8.5 (NTS, x64) and Laravel 11.
2. **MongoDB Integration**: Integrated `mongodb/laravel-mongodb` v5 with schema validation and optimized indexes.
3. **Robust Seeding Mechanism**: Added custom artisan command (`php artisan sgc:seed` / `.\scripts\seed_db.ps1`) that automatically drops old data, creates collections with strict `$jsonSchema` validation, applies necessary indexes, and seeds 150+ realistic check-in records.
4. **NFC Concurrency & Race Condition Safety**: Implemented MongoDB atomic transactions and a partial unique index (`studentId` where `status == 'active'`) to ensure that rapid double-taps on the NFC sticker are blocked directly at the database layer (returning HTTP 409).
5. **JWT Authentication**: Secured all non-public endpoints using `jwt-auth`. The mobile app attaches `Authorization: Bearer <token>` to requests.
6. **Asynchronous Architecture**: Moved Firebase Cloud Messaging (FCM) push notifications and dashboard summary aggregations to Redis-backed queues so they don't block the API response when a student taps their phone.
7. **IDE Type Safety**: Fixed and optimized code docblocks across all controllers and models for clean static analysis.
8. **E2E Testing Scripts**: Created a robust End-to-End test suite (`run_tests_e2e.ps1`) that sequentially validates the core flows.
9. **Live Mobile Client Integration**: Connected the Expo/React Native mobile client directly to the live Laravel backend (`CONFIG.USE_MOCK = false` via `user/src/services/api/`).
10. **Dynamic Local IP Discovery**: Configured `user/src/config.js` to automatically extract the developer PC's LAN IP from `Constants.expoConfig.hostUri`, while `.\scripts\start_api.ps1` binds to `0.0.0.0:8000` so mobile phones running Expo Go on the local Wi-Fi connect seamlessly.
11. **Live Facility Occupancy Polling**: Implemented `useLiveOccupancy` with automatic 3.5s polling, battery-friendly background pause, and immediate resume sync.
12. **Pull-to-Refresh & Visit Formatting**: Added native pull-to-refresh gestures across Home, History, and Profile screens, 12-hour AM/PM timestamps, and `< 1m` duration handling.

## Environment & Scripts

For developers running this locally on Windows, we've created helpful PowerShell wrappers in the `scripts` directory:

- `.\scripts\setup_new_php.ps1`: One-time setup: installs `ext-mongodb` DLL and configures project-local `php-conf.d` overrides.
- `.\scripts\seed_db.ps1`: Resets and seeds the MongoDB database with deterministic data.
- `.\scripts\start_api.ps1 <port>`: Starts the Laravel server on `0.0.0.0:<port>` (default 8000).
- `.\scripts\start_workers.ps1 <queue>`: Starts Redis background queue workers.
- `.\scripts\run_tests_e2e.ps1`: Runs the automated E2E test sequence against the running API.

## Notes for Mobile (Jedrek)

- The live API is now actively connected (`user/src/config.js` with `USE_MOCK: false`).
- API requests use `user/src/services/api/*` and attach the Bearer JWT token automatically on authenticated routes.
- The NFC Check-in endpoint expects `{"gymId": "gym-001", "nfcPayload": "SGC-GYM"}`.
- Demo credentials remain `20241234` / `password`.

## Notes for Admin Dashboard (Javo)

- Use `/api/dashboard/gyms/{gymId}/summary/{date}` and `/api/dashboard/gyms/{gymId}/weekly` to fetch data for your Chart.js widgets.
- The endpoint is protected. You must log in using the admin demo credentials (`00000001` / `password`).

Ready to merge into `dev` when you are!
