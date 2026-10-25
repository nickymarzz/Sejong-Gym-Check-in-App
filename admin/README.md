# SGC Admin Dashboard (`/admin`)

Web dashboard for gym staff: live occupancy, the students currently inside, gym settings, and daily / weekly analytics built with Chart.js.
It is plain HTML, CSS and JavaScript (no build step, no `npm install`) and talks to the Laravel API in `/backend`.

## Run it

1. Start the backend as described in the root README (MongoDB, `seed_db.ps1`, `start_api.ps1`). The API runs on port 8000.
2. Serve the dashboard:

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\scripts\start_admin.ps1
   # optional port: ... start_admin.ps1 5600
   ```

   The script uses the same PHP as the backend (`php -S`) and falls back to Python if PHP is not found.
3. Open <http://localhost:5500> and sign in with the admin demo account: `00000001` / `password`.

The browser calls the API directly, so the API has to accept cross-origin requests from the dashboard's address.
Chart.js is loaded from cdnjs (version 4.4.1 with an integrity hash), so the first load needs internet access.

## Features

| Section | What it shows | Endpoint | Refresh |
| --- | --- | --- | --- |
| Live occupancy | People inside, capacity, status badge, opening hours | `GET /api/gym/status/{gymId}` (public) | every 3.5 s |
| Inside now | Students currently checked in, with time inside; filter by name, ID or department | `GET /api/dashboard/gyms/{gymId}/active` | every 3.5 s |
| Gym settings | Change capacity, status and opening hours | `PATCH /api/dashboard/gyms/{gymId}/settings` | on save |
| Last 7 days | Visits, unique students, peak occupancy, average workout length | `GET /api/dashboard/gyms/{gymId}/weekly` | every 30 s |
| Day detail | Stat tiles and check-ins / people inside by hour for any past day | `GET /api/dashboard/gyms/{gymId}/summary/{date}` | every 30 s while viewing today |

- Select a bar in the first weekly chart (or a day in the weekly table) to open that day in Day detail.
- Every chart has a "View as a table" version underneath.
- Gym settings are validated in the form first (capacity range, capacity not below the people currently inside, closing time after opening time) and again by the API. Closing the gym or putting it into maintenance asks for confirmation.
- Polling pauses while the browser tab is hidden and catches up when it becomes visible again.
- Only `admin` and `staff` accounts can use the dashboard. Student tokens are invalidated on sign-in, and an expired token returns you to the sign-in screen.

## Project layout

```text
admin/
├── index.html          # Sign-in view and dashboard view
├── css/styles.css      # Design tokens, light / dark theme, layout
└── js/
    ├── config.js       # Gym id, timezone, polling intervals, API port
    ├── format.js       # Asia/Seoul dates, number and duration formatting
    ├── api.js          # Fetch client, admin session, endpoint wrappers
    ├── dom.js          # DOM helpers and table builder
    ├── state.js        # Shared state, error banner, connection indicator
    ├── charts.js       # Chart.js wrappers (colors come from CSS variables)
    ├── live.js         # Live occupancy card
    ├── sessions.js     # "Inside now" list
    ├── settings.js     # Gym settings form
    ├── weekly.js       # Last 7 days section
    ├── daily.js        # Day detail section
    └── app.js          # Sign-in flow, polling, wiring
```

## Backend routes used

The two routes below were added together with the dashboard. All `/api/dashboard/*` routes sit behind the `jwt.auth` and `role.staff` middleware (`EnsureStaffRole`).

- `GET /api/dashboard/gyms/{gymId}/active` returns `{ checkInId, studentId, name, department, checkInTime, minutesInside }` for every active check-in.
- `PATCH /api/dashboard/gyms/{gymId}/settings` accepts `capacity`, `status` and `openingHours`; see `UpdateGymRequest` for the rules. It rejects a capacity that is lower than the current occupancy.

`backend/storage/app/e2e_test.php` covers both routes, including the `403` for student tokens.

## Configuration

- **API address:** defaults to `http://<host that served the page>:8000/api`. Change it at runtime with "Server settings" on the sign-in screen (stored in `localStorage`), or edit `API_PORT` in `js/config.js`.
- **Gym, timezone, polling intervals, capacity limit:** `js/config.js`.
- **Colors:** CSS variables at the top of `css/styles.css`. Each measure keeps one color in every chart: visits blue, unique students orange, occupancy aqua, workout length violet.

## Notes

- The `peakHour` field is `"18:00 - 19:00"` in seeded data and `"18:00"` when written by the queue job. The dashboard shows both as `18:00–19:00`.
- A day's summary is created by the `analytics` queue job on its first check-in, so it only updates while `start_workers.ps1 analytics` is running (or `QUEUE_CONNECTION=sync`). Days without a summary show an empty state.
- The weekly endpoint omits days that have no summary; those days stay empty in the charts.
