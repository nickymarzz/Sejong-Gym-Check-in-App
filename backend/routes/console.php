<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('sgc:seed', function () {
    $this->info('=======================================================');
    $this->info('  Initializing + Seeding Sejong Gym Check-in Database  ');
    $this->info('=======================================================');

    $db = DB::connection('mongodb')->getMongoDB();

    $this->newLine();
    $this->info('[1/6] Clearing existing collections...');
    foreach (['Users', 'Gyms', 'CheckIns', 'DailySummaries', 'Notifications'] as $c) {
        try { $db->dropCollection($c); } catch (\Throwable) {}
    }
    $this->info('  ✓ Dropped old collections');

    $this->newLine();
    $this->info('[2/6] Creating collections with JSON schema validation...');
    $setup = function (string $collName, array $validator) use ($db) {
        $existing = iterator_to_array($db->listCollectionNames());
        if (in_array($collName, $existing, true)) {
            $db->command(['collMod' => $collName, 'validator' => $validator, 'validationLevel' => 'moderate']);
        } else {
            $db->createCollection($collName, ['validator' => $validator, 'validationLevel' => 'strict', 'validationAction' => 'error']);
        }
        $this->info("  [INFO] Collection: $collName");
    };

    $setup('Users', ['$jsonSchema' => [
        'bsonType' => 'object',
        'required' => ['userId', 'studentId', 'name', 'email', 'passwordHash', 'role'],
        'properties' => [
            'userId' => ['bsonType' => 'string'],
            'studentId' => ['bsonType' => 'string', 'pattern' => '^[0-9]{8}$'],
            'name' => ['bsonType' => 'string'],
            'email' => ['bsonType' => 'string', 'pattern' => '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'],
            'passwordHash' => ['bsonType' => 'string'],
            'role' => ['enum' => ['student', 'admin', 'staff']],
        ],
    ]]);
    $setup('Gyms', ['$jsonSchema' => [
        'bsonType' => 'object',
        'required' => ['gymId', 'gymName', 'location', 'capacity', 'currentOccupancy', 'status', 'nfcTagIdentifier'],
    ]]);
    $setup('CheckIns', ['$jsonSchema' => [
        'bsonType' => 'object',
        'required' => ['userId', 'studentId', 'gymId', 'nfcPayload', 'checkInTime', 'status'],
    ]]);
    $setup('DailySummaries', ['$jsonSchema' => [
        'bsonType' => 'object',
        'required' => ['gymId', 'date', 'totalVisits', 'uniqueStudents', 'peakOccupancy', 'averageDurationMinutes'],
    ]]);
    $this->info('  ✓ Collections + validators applied');

    $this->newLine();
    $this->info('[3/6] Creating performance + security indexes...');
    $db->selectCollection('Users')->createIndex(['studentId' => 1], ['unique' => true, 'name' => 'uniq_student_id']);
    $db->selectCollection('Users')->createIndex(['email' => 1], ['unique' => true, 'name' => 'uniq_email']);
    $db->selectCollection('Gyms')->createIndex(['gymId' => 1], ['unique' => true, 'name' => 'uniq_gym_id']);
    $db->selectCollection('CheckIns')->createIndex(
        ['studentId' => 1],
        ['unique' => true, 'partialFilterExpression' => ['status' => 'active'], 'name' => 'uniq_active_checkin_per_student']
    );
    $db->selectCollection('CheckIns')->createIndex(['studentId' => 1, 'checkInTime' => -1], ['name' => 'idx_student_history']);
    $db->selectCollection('CheckIns')->createIndex(['gymId' => 1, 'status' => 1], ['name' => 'idx_gym_occupancy']);
    $db->selectCollection('DailySummaries')->createIndex(['gymId' => 1, 'date' => 1], ['unique' => true, 'name' => 'uniq_gym_date_summary']);
    $this->info('  ✓ All indexes (incl. anti-duplicate partial unique on CheckIns.studentId)');

    $nowTs = (int)(microtime(true) * 1000);
    $now = new \MongoDB\BSON\UTCDateTime($nowTs);
    $daysAgo = function (int $days, int $hours = 10, int $minutes = 0) use ($nowTs): \MongoDB\BSON\UTCDateTime {
        $d = new DateTime('@' . (int)($nowTs / 1000));
        $d->setTimezone(new DateTimeZone('Asia/Seoul'));
        $d->modify("-$days days");
        $d->setTime($hours, $minutes, 0);
        return new \MongoDB\BSON\UTCDateTime($d->getTimestamp() * 1000);
    };
    $minutesAgo = function (int $mins) use ($nowTs): \MongoDB\BSON\UTCDateTime {
        return new \MongoDB\BSON\UTCDateTime($nowTs - $mins * 60 * 1000);
    };
    $DEFAULT_PASSWORD_HASH = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

    $this->newLine();
    $this->info('[4/6] Seeding Gyms...');
    $gymData = [
        'gymId' => 'gym-001', 'gymName' => 'Sejong University Gymnasium',
        'location' => 'Student Union Building B, 3F', 'capacity' => 50,
        'currentOccupancy' => 24, 'status' => 'open', 'nfcTagIdentifier' => 'SGC-GYM',
        'openingHours' => ['open' => '06:00', 'close' => '22:00'],
        'createdAt' => $daysAgo(30, 8, 0), 'updatedAt' => $now,
    ];
    $db->selectCollection('Gyms')->insertOne($gymData);
    $this->info("  ✓ Gym: {$gymData['gymName']}, Capacity {$gymData['capacity']}, NFC={$gymData['nfcTagIdentifier']}");

    $this->newLine();
    $this->info('[5/6] Seeding Users (Students + Admin)...');
    $usersList = [
        ['userId' => 'student-001', 'studentId' => '20241234', 'name' => 'Demo Student', 'email' => '20241234@sejong.ac.kr', 'passwordHash' => $DEFAULT_PASSWORD_HASH, 'role' => 'student', 'department' => 'Department of Computer Engineering', 'year' => 2, 'checkedIn' => false, 'checkInTime' => null, 'createdAt' => $daysAgo(20), 'updatedAt' => $now],
        ['userId' => 'student-002', 'studentId' => '20245678', 'name' => 'Min-Jun Kim', 'email' => '20245678@sejong.ac.kr', 'passwordHash' => $DEFAULT_PASSWORD_HASH, 'role' => 'student', 'department' => 'Software Engineering', 'year' => 3, 'checkedIn' => true, 'checkInTime' => $minutesAgo(48), 'createdAt' => $daysAgo(15), 'updatedAt' => $now],
        ['userId' => 'student-003', 'studentId' => '20231122', 'name' => 'Seo-Yeon Lee', 'email' => '20231122@sejong.ac.kr', 'passwordHash' => $DEFAULT_PASSWORD_HASH, 'role' => 'student', 'department' => 'Digital Content', 'year' => 4, 'checkedIn' => true, 'checkInTime' => $minutesAgo(32), 'createdAt' => $daysAgo(25), 'updatedAt' => $now],
        ['userId' => 'student-004', 'studentId' => '20249988', 'name' => 'Ji-Hoon Park', 'email' => '20249988@sejong.ac.kr', 'passwordHash' => $DEFAULT_PASSWORD_HASH, 'role' => 'student', 'department' => 'Physical Education', 'year' => 1, 'checkedIn' => false, 'checkInTime' => null, 'createdAt' => $daysAgo(10), 'updatedAt' => $now],
        ['userId' => 'student-005', 'studentId' => '20224433', 'name' => 'Ha-Eun Jung', 'email' => '20224433@sejong.ac.kr', 'passwordHash' => $DEFAULT_PASSWORD_HASH, 'role' => 'student', 'department' => 'Mechanical Engineering', 'year' => 3, 'checkedIn' => false, 'checkInTime' => null, 'createdAt' => $daysAgo(18), 'updatedAt' => $now],
        ['userId' => 'admin-001',   'studentId' => '00000001', 'name' => 'Gym Staff Admin', 'email' => 'admin@sejong.ac.kr',  'passwordHash' => $DEFAULT_PASSWORD_HASH, 'role' => 'admin',  'department' => 'Campus Athletic Facilities & Management', 'year' => 4, 'checkedIn' => false, 'checkInTime' => null, 'createdAt' => $daysAgo(40), 'updatedAt' => $now],
    ];
    for ($i = 6; $i <= 27; $i++) {
        $paddedId = (string)(20240000 + $i);
        $mins = (int)(10 + mt_rand() / mt_getrandmax() * 80);
        $usersList[] = [
            'userId' => 'student-0' . ($i < 10 ? '0' . $i : $i),
            'studentId' => $paddedId,
            'name' => 'Student ' . $paddedId,
            'email' => $paddedId . '@sejong.ac.kr',
            'passwordHash' => $DEFAULT_PASSWORD_HASH,
            'role' => 'student',
            'department' => $i % 2 === 0 ? 'Artificial Intelligence' : 'Business Administration',
            'year' => ($i % 4) + 1,
            'checkedIn' => true,
            'checkInTime' => $minutesAgo($mins),
            'createdAt' => $daysAgo(14),
            'updatedAt' => $now,
        ];
    }
    $db->selectCollection('Users')->insertMany($usersList);
    $this->info('  ✓ Seeded ' . count($usersList) . ' users (students + admin)');

    $this->newLine();
    $this->info('[6/6] Seeding CheckIns + DailySummaries...');
    $checkInsList = [];
    $demoVisits = [
        ['days' => 6, 'inH' => 8,  'inM' => 0,  'outH' => 9,  'outM' => 20],
        ['days' => 5, 'inH' => 19, 'inM' => 30, 'outH' => 20, 'outM' => 50],
        ['days' => 4, 'inH' => 13, 'inM' => 0,  'outH' => 14, 'outM' => 30],
        ['days' => 2, 'inH' => 7,  'inM' => 15, 'outH' => 8,  'outM' => 30],
        ['days' => 1, 'inH' => 18, 'inM' => 0,  'outH' => 19, 'outM' => 45],
    ];
    foreach ($demoVisits as $v) {
        $ci = $daysAgo($v['days'], $v['inH'], $v['inM']);
        $co = $daysAgo($v['days'], $v['outH'], $v['outM']);
        $dur = (int)(($co->toDateTime()->getTimestamp() - $ci->toDateTime()->getTimestamp()) / 60);
        $checkInsList[] = [
            'userId' => 'student-001', 'studentId' => '20241234',
            'gymId' => 'gym-001', 'gymName' => 'Sejong University Gymnasium',
            'nfcPayload' => 'SGC-GYM',
            'checkInTime' => $ci, 'checkOutTime' => $co,
            'durationMinutes' => $dur, 'status' => 'completed',
            'createdAt' => $ci, 'updatedAt' => $co,
        ];
    }
    $activeUsers = array_values(array_filter($usersList, fn($u) => $u['checkedIn'] === true));
    foreach ($activeUsers as $u) {
        $checkInsList[] = [
            'userId' => $u['userId'], 'studentId' => $u['studentId'],
            'gymId' => 'gym-001', 'gymName' => 'Sejong University Gymnasium',
            'nfcPayload' => 'SGC-GYM',
            'checkInTime' => $u['checkInTime'], 'checkOutTime' => null,
            'durationMinutes' => null, 'status' => 'active',
            'createdAt' => $u['checkInTime'], 'updatedAt' => $now,
        ];
    }
    for ($d = 7; $d >= 1; $d--) {
        $visitCount = 15 + (int)(mt_rand() / mt_getrandmax() * 10);
        for ($k = 0; $k < $visitCount; $k++) {
            $student = $usersList[$k % count($usersList)];
            if ($student['role'] === 'admin' || $student['studentId'] === '20241234') continue;
            $startH = 8 + (int)(mt_rand() / mt_getrandmax() * 12);
            $startM = (int)(mt_rand() / mt_getrandmax() * 60);
            $ci = $daysAgo($d, $startH, $startM);
            $durMins = 35 + (int)(mt_rand() / mt_getrandmax() * 75);
            $co = new \MongoDB\BSON\UTCDateTime($ci->toDateTime()->getTimestamp() * 1000 + $durMins * 60 * 1000);
            $checkInsList[] = [
                'userId' => $student['userId'], 'studentId' => $student['studentId'],
                'gymId' => 'gym-001', 'gymName' => 'Sejong University Gymnasium',
                'nfcPayload' => 'SGC-GYM',
                'checkInTime' => $ci, 'checkOutTime' => $co,
                'durationMinutes' => $durMins, 'status' => 'completed',
                'createdAt' => $ci, 'updatedAt' => $co,
            ];
        }
    }
    $db->selectCollection('CheckIns')->insertMany($checkInsList);
    $activeCount = count($activeUsers);
    $this->info("  ✓ CheckIns: " . count($checkInsList) . " total ($activeCount active)");

    $dailySummaries = [];
    for ($d = 7; $d >= 1; $d--) {
        $targetDate = $daysAgo($d);
        $dateStr = $targetDate->toDateTime()->setTimezone(new DateTimeZone('Asia/Seoul'))->format('Y-m-d');
        $hours = [
            ['hour' => '06:00', 'visits' => 4,  'occupancy' => 4],
            ['hour' => '08:00', 'visits' => 12, 'occupancy' => 10],
            ['hour' => '10:00', 'visits' => 18, 'occupancy' => 16],
            ['hour' => '12:00', 'visits' => 24, 'occupancy' => 22],
            ['hour' => '14:00', 'visits' => 20, 'occupancy' => 18],
            ['hour' => '16:00', 'visits' => 32, 'occupancy' => 28],
            ['hour' => '18:00', 'visits' => 46, 'occupancy' => 42],
            ['hour' => '20:00', 'visits' => 30, 'occupancy' => 26],
        ];
        $totalVisits = array_sum(array_column($hours, 'visits'));
        $peakOccupancy = max(array_column($hours, 'occupancy'));
        $dailySummaries[] = [
            'gymId' => 'gym-001', 'date' => $dateStr,
            'totalVisits' => $totalVisits,
            'uniqueStudents' => (int)($totalVisits * 0.85),
            'peakOccupancy' => $peakOccupancy,
            'peakHour' => '18:00 - 19:00',
            'averageDurationMinutes' => 65,
            'hourlyBreakdown' => $hours,
            'createdAt' => $targetDate, 'updatedAt' => $targetDate,
        ];
    }
    $db->selectCollection('DailySummaries')->insertMany($dailySummaries);
    $this->info('  ✓ DailySummaries: ' . count($dailySummaries) . ' days');

    $this->newLine();
    $this->info('=======================================================');
    $this->info('  Verification Report');
    $this->info('=======================================================');
    $userCount = $db->selectCollection('Users')->countDocuments();
    $gymCount = $db->selectCollection('Gyms')->countDocuments();
    $checkInCount = $db->selectCollection('CheckIns')->countDocuments();
    $activeCheckInCount = $db->selectCollection('CheckIns')->countDocuments(['status' => 'active']);
    $summaryCount = $db->selectCollection('DailySummaries')->countDocuments();
    $this->table(
        ['Metric', 'Count'],
        [
            ['Total Users', $userCount],
            ['Gym Facilities', $gymCount],
            ['Total Check-in Records', $checkInCount],
            ['Active In-Gym Students', $activeCheckInCount],
            ['Daily Summaries', $summaryCount],
        ]
    );
    $sample = $db->selectCollection('Users')->findOne(['studentId' => '20241234'], ['projection' => ['name' => 1, 'department' => 1, 'role' => 1, '_id' => 0]]);
    $this->info("[TEST] Demo Student (20241234): {$sample['name']} / {$sample['department']} / {$sample['role']}");
    $g = $db->selectCollection('Gyms')->findOne(['gymId' => 'gym-001'], ['projection' => ['gymName' => 1, 'currentOccupancy' => 1, 'capacity' => 1, '_id' => 0]]);
    $match = $g['currentOccupancy'] === $activeCheckInCount ? 'VERIFIED' : 'MISMATCH';
    $this->info("[TEST] Gym Occupancy: {$g['gymName']} => {$g['currentOccupancy']}/{$g['capacity']} ($match active count)");
    $this->newLine();
    $this->info('[SUCCESS] Database initialized + seeded successfully!');
    $this->line("  Login demo student: 20241234 / password");
    $this->line("  Login admin:        00000001 / password");
})->purpose('(Re)initialize SGC schema + indexes + seed data into MongoDB (idempotent, drops collections first)');
