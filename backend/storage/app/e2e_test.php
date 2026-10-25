<?php
$port = $argv[1] ?? '8000';
$BASE = "http://127.0.0.1:$port";

function hit(string $method, string $path, array $headers = [], $body = null): array {
    global $BASE;
    $ctx = [
        'http' => [
            'method' => $method,
            'header' => implode("\r\n", array_merge([
                'Accept: application/json',
                'Content-Type: application/json',
            ], $headers)),
            'ignore_errors' => true,
            'timeout' => 10,
        ],
    ];
    if ($body !== null) {
        $ctx['http']['content'] = is_string($body) ? $body : json_encode($body);
    }
    $res = @file_get_contents($BASE . $path, false, stream_context_create($ctx));
    $status = 0;
    if (isset($http_response_header[0])) {
        preg_match('#\s(\d{3})\s#', $http_response_header[0], $m);
        $status = (int)($m[1] ?? 0);
    }
    return [$status, $res, $http_response_header ?? []];
}

function printLine(string $label, int $status, string|bool $body): void {
    $pretty = $body;
    $dec = json_decode($body, true);
    if ($dec !== null) {
        $pretty = json_encode($dec, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    }
    echo "[$status] $label\n";
    if (strlen($pretty) > 600) {
        echo "    " . substr($pretty, 0, 600) . "...\n";
    } else {
        foreach (explode("\n", $pretty) as $ln) {
            echo "    $ln\n";
        }
    }
    echo "\n";
}

echo "--- End-to-end HTTP test on seeded database ---\n\n";

// 1. Gym list
[$s, $b] = hit('GET', '/api/gyms');
printLine('GET /api/gyms', $s, $b);

// 2. Gym status aggregate
[$s, $b] = hit('GET', '/api/gym/status');
printLine('GET /api/gym/status', $s, $b);

// 3. Specific gym status
[$s, $b] = hit('GET', '/api/gym/status/gym-001');
printLine('GET /api/gym/status/gym-001', $s, $b);

// 4. Login as demo student
[$s, $b] = hit('POST', '/api/auth/login', [], ['studentId' => '20241234', 'password' => 'password']);
printLine('POST /api/auth/login (20241234/password)', $s, $b);
$dec = json_decode($b, true);
$jwt = $dec['data']['token'] ?? null;

if ($jwt) {
    echo "  >> Token acquired (len=" . strlen($jwt) . ")\n\n";
    $authHeader = "Authorization: Bearer $jwt";

    // 5. /auth/me
    [$s, $b] = hit('GET', '/api/auth/me', [$authHeader]);
    printLine('GET /api/auth/me (Bearer JWT)', $s, $b);

    // 6. Check-in (should be valid first tap)
    $testHeaders = [$authHeader, 'X-Bypass-Hours: true'];
    [$s, $b] = hit('POST', '/api/checkins', $testHeaders, ['gymId' => 'gym-001', 'nfcPayload' => 'SGC-GYM']);
    printLine('POST /api/checkins (first tap)', $s, $b);

    // 7. Double tap (should 409 via E11000 partial unique)
    [$s2, $b2] = hit('POST', '/api/checkins', $testHeaders, ['gymId' => 'gym-001', 'nfcPayload' => 'SGC-GYM']);
    printLine('POST /api/checkins (double tap — expect 409)', $s2, $b2);

    // 8. Check out
    [$s, $b] = hit('POST', '/api/checkouts', [$authHeader]);
    printLine('POST /api/checkouts', $s, $b);

    // 9. Check-in history
    [$s, $b] = hit('GET', '/api/checkins/history', [$authHeader]);
    printLine('GET /api/checkins/history', $s, $b);

    // 10. Notifications feed
    [$s, $b] = hit('GET', '/api/notifications', [$authHeader]);
    printLine('GET /api/notifications', $s, $b);
} else {
    echo "  !! Login failed — skipping JWT-gated endpoints\n";
}

// 11. Admin login + dashboard
[$s, $b] = hit('POST', '/api/auth/login', [], ['studentId' => '00000001', 'password' => 'password']);
printLine('POST /api/auth/login (admin 00000001)', $s, $b);
$dec = json_decode($b, true);
$adminJwt = $dec['data']['token'] ?? null;
if ($adminJwt) {
    $today = (new DateTime('now', new DateTimeZone('Asia/Seoul')))->format('Y-m-d');
    [$s, $b] = hit('GET', "/api/dashboard/gyms/gym-001/summary/$today", ["Authorization: Bearer $adminJwt"]);
    printLine("GET /api/dashboard/gyms/gym-001/summary/$today", $s, $b);

    [$s, $b] = hit('GET', '/api/dashboard/gyms/gym-001/weekly', ["Authorization: Bearer $adminJwt"]);
    printLine('GET /api/dashboard/gyms/gym-001/weekly', $s, $b);

    $adminAuth = "Authorization: Bearer $adminJwt";

    [$s, $b] = hit('GET', '/api/dashboard/gyms/gym-001/active', [$adminAuth]);
    printLine('GET /api/dashboard/gyms/gym-001/active', $s, $b);

    [$s, $b] = hit('PATCH', '/api/dashboard/gyms/gym-001/settings', [$adminAuth], ['capacity' => 60]);
    printLine('PATCH /api/dashboard/gyms/gym-001/settings (capacity 60)', $s, $b);

    [$s, $b] = hit('PATCH', '/api/dashboard/gyms/gym-001/settings', [$adminAuth], ['capacity' => 1]);
    printLine('PATCH /api/dashboard/gyms/gym-001/settings (capacity below occupancy — expect 422)', $s, $b);

    [$s, $b] = hit('PATCH', '/api/dashboard/gyms/gym-001/settings', [$adminAuth], ['status' => 'bogus']);
    printLine('PATCH /api/dashboard/gyms/gym-001/settings (invalid status — expect 422)', $s, $b);

    [$s, $b] = hit('PATCH', '/api/dashboard/gyms/gym-001/settings', [$adminAuth], ['capacity' => 50]);
    printLine('PATCH /api/dashboard/gyms/gym-001/settings (restore capacity 50)', $s, $b);
}

if ($jwt) {
    [$s, $b] = hit('PATCH', '/api/dashboard/gyms/gym-001/settings', [$authHeader], ['capacity' => 10]);
    printLine('PATCH /api/dashboard/gyms/gym-001/settings (student token — expect 403)', $s, $b);

    [$s, $b] = hit('GET', '/api/dashboard/gyms/gym-001/active', [$authHeader]);
    printLine('GET /api/dashboard/gyms/gym-001/active (student token — expect 403)', $s, $b);
}
