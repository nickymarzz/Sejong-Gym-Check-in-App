<?php

namespace Tests\Feature;

use App\Models\CheckIn;
use Tests\TestCase;

class NfcEdgeCasesTest extends TestCase
{
    /**
     * Week 12: Test auto-healing of stale overnight sessions.
     * When a student forgot to check out yesterday and returns today,
     * the system automatically closes the stale session and starts a new one.
     */
    public function test_stale_overnight_session_is_auto_healed_on_next_tap(): void
    {
        $gym = $this->createTestGym(['currentOccupancy' => 1]);
        $student = $this->createStudentUser(['checkedIn' => true]);
        $headers = $this->getAuthHeaders($student);

        // Simulate stale session created yesterday at 18:00
        $yesterday = now('Asia/Seoul')->subDay()->setTime(18, 0, 0);
        $staleCheckIn = CheckIn::create([
            'userId' => $student->userId,
            'studentId' => $student->studentId,
            'gymId' => $gym->gymId,
            'gymName' => $gym->gymName,
            'nfcPayload' => 'SGC-GYM',
            'checkInTime' => $yesterday,
            'status' => CheckIn::STATUS_ACTIVE,
        ]);

        // Student taps NFC again today
        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Check-in successful.',
            ]);

        // Verify yesterday's session was auto-expired
        $staleCheckIn->refresh();
        $this->assertEquals(CheckIn::STATUS_AUTO_EXPIRED, $staleCheckIn->status);
        $this->assertNotNull($staleCheckIn->checkOutTime);

        // Verify fresh active session exists for today
        $activeSession = CheckIn::where('userId', $student->userId)
            ->where('status', CheckIn::STATUS_ACTIVE)
            ->first();
        $this->assertNotNull($activeSession);
        $this->assertNotEquals((string) $staleCheckIn->_id, (string) $activeSession->_id);

        // Verify gym occupancy is 1 (old 1 was decremented, new 1 was incremented)
        $gym->refresh();
        $this->assertEquals(1, $gym->currentOccupancy);
    }

    /**
     * Week 12: Test strict capacity boundary limits.
     * Gym cannot exceed max capacity under any circumstances.
     */
    public function test_capacity_boundary_limit_strictly_enforced(): void
    {
        $gym = $this->createTestGym([
            'capacity' => 2,
            'currentOccupancy' => 2,
        ]);

        $student = $this->createStudentUser();
        $headers = $this->getAuthHeaders($student);

        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);

        $response->assertStatus(409)
            ->assertJson([
                'status' => 'error',
                'message' => 'Gym is at full capacity. Please wait or try another facility.',
            ]);

        $gym->refresh();
        $this->assertEquals(2, $gym->currentOccupancy, "Occupancy must remain capped at max capacity.");
    }

    /**
     * Week 12: Test auto-checkout console command (scheduled at 22:00 closing time).
     */
    public function test_daily_closing_auto_checkout_command(): void
    {
        $gym = $this->createTestGym(['currentOccupancy' => 3]);
        
        $s1 = $this->createStudentUser(['studentId' => '20240001', 'checkedIn' => true]);
        $s2 = $this->createStudentUser(['studentId' => '20240002', 'checkedIn' => true]);
        $s3 = $this->createStudentUser(['studentId' => '20240003', 'checkedIn' => true]);

        foreach ([$s1, $s2, $s3] as $s) {
            CheckIn::create([
                'userId' => $s->userId,
                'studentId' => $s->studentId,
                'gymId' => $gym->gymId,
                'gymName' => $gym->gymName,
                'nfcPayload' => 'SGC-GYM',
                'checkInTime' => now()->subHours(2),
                'status' => CheckIn::STATUS_ACTIVE,
            ]);
        }

        // Run the auto-checkout command
        $this->artisan('sgc:auto-checkout', ['gymId' => $gym->gymId])
            ->assertSuccessful();

        // Verify all 3 sessions are closed as auto_expired
        $activeCount = CheckIn::where('gymId', $gym->gymId)->where('status', CheckIn::STATUS_ACTIVE)->count();
        $this->assertEquals(0, $activeCount);

        // Verify gym occupancy reset to 0
        $gym->refresh();
        $this->assertEquals(0, $gym->currentOccupancy);
    }

    /**
     * FR-3 & Week 9: Test automated gym closing reminder command dispatched to Redis queue.
     */
    public function test_daily_closing_reminders_command_dispatches_notifications(): void
    {
        $gym = $this->createTestGym(['currentOccupancy' => 2]);

        $s1 = $this->createStudentUser(['studentId' => '20240010', 'checkedIn' => true]);
        $s2 = $this->createStudentUser(['studentId' => '20240011', 'checkedIn' => true]);

        foreach ([$s1, $s2] as $s) {
            CheckIn::create([
                'userId' => $s->userId,
                'studentId' => $s->studentId,
                'gymId' => $gym->gymId,
                'gymName' => $gym->gymName,
                'nfcPayload' => 'SGC-GYM',
                'checkInTime' => now()->subHour(),
                'status' => CheckIn::STATUS_ACTIVE,
            ]);
        }

        $this->artisan('sgc:send-reminders', ['gymId' => $gym->gymId])
            ->assertSuccessful();

        // Verify notifications were created for both occupants
        $notifCount = \App\Models\Notification::where('type', \App\Models\Notification::TYPE_CAPACITY)->count();
        $this->assertEquals(2, $notifCount);
    }
}

