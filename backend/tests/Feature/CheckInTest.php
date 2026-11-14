<?php

namespace Tests\Feature;

use App\Models\CheckIn;
use Tests\TestCase;

class CheckInTest extends TestCase
{
    public function test_student_can_checkin_with_valid_nfc_payload(): void
    {
        $gym = $this->createTestGym();
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Check-in successful.',
            ]);

        $this->assertDatabaseHas('CheckIns', [
            'userId' => $user->userId,
            'gymId' => $gym->gymId,
            'status' => CheckIn::STATUS_ACTIVE,
        ]);

        $gym->refresh();
        $this->assertEquals(1, $gym->currentOccupancy);

        $user->refresh();
        $this->assertTrue((bool) $user->checkedIn);
    }

    public function test_checkin_fails_with_invalid_nfc_payload(): void
    {
        $gym = $this->createTestGym();
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'INVALID-TAG-XYZ',
        ], $headers);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);

        $gym->refresh();
        $this->assertEquals(0, $gym->currentOccupancy);
    }

    public function test_duplicate_checkin_is_rejected(): void
    {
        $gym = $this->createTestGym();
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        // First check-in
        $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers)->assertStatus(201);

        // Second duplicate check-in
        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);

        $response->assertStatus(409)
            ->assertJson([
                'status' => 'error',
                'message' => 'Already checked in. Please check out first.',
            ]);

        $gym->refresh();
        $this->assertEquals(1, $gym->currentOccupancy);
    }

    public function test_student_can_checkout_successfully(): void
    {
        $gym = $this->createTestGym();
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        // Check in first
        $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers)->assertStatus(201);

        // Checkout
        $response = $this->postJson('/api/checkins/checkout', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Check-out successful.',
            ]);

        $gym->refresh();
        $this->assertEquals(0, $gym->currentOccupancy);

        $user->refresh();
        $this->assertFalse((bool) $user->checkedIn);
    }

    public function test_checkout_fails_when_not_checked_in(): void
    {
        $gym = $this->createTestGym();
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        $response = $this->postJson('/api/checkins/checkout', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);

        $response->assertStatus(409)
            ->assertJson([
                'status' => 'error',
                'message' => 'No active check-in session found.',
            ]);
    }

    public function test_checkin_fails_when_gym_is_at_full_capacity(): void
    {
        $gym = $this->createTestGym([
            'capacity' => 1,
            'currentOccupancy' => 1,
        ]);
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);

        $response->assertStatus(409)
            ->assertJson([
                'status' => 'error',
                'message' => 'Gym is at full capacity. Please wait or try another facility.',
            ]);
    }

    public function test_checkin_fails_when_gym_is_closed(): void
    {
        $gym = $this->createTestGym([
            'status' => 'closed',
        ]);
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);

        $response->assertStatus(409)
            ->assertJson([
                'status' => 'error',
            ]);
    }
}
