<?php

namespace Tests;

use App\Models\Gym;
use App\Models\User;
use App\Models\CheckIn;
use App\Models\DailySummary;
use App\Models\Notification;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

abstract class TestCase extends BaseTestCase
{
    use CreatesApplication;

    protected function setUp(): void
    {
        parent::setUp();
        // Clean collections in isolated testing DB
        User::truncate();
        Gym::truncate();
        CheckIn::truncate();
        DailySummary::truncate();
        Notification::truncate();
    }

    /**
     * Create a standard test gym record.
     */
    protected function createTestGym(array $overrides = []): Gym
    {
        return Gym::create(array_merge([
            'gymId' => 'gym-001',
            'gymName' => 'Sejong University Gymnasium',
            'location' => 'Student Union Building B, 3F',
            'capacity' => 50,
            'currentOccupancy' => 0,
            'status' => 'open',
            'nfcTagIdentifier' => 'SGC-GYM',
            'openingHours' => [
                'open' => '00:00', // Set 00:00 - 23:59 so test runs at any hour
                'close' => '23:59'
            ],
        ], $overrides));
    }

    /**
     * Create a standard student user.
     */
    protected function createStudentUser(array $overrides = []): User
    {
        $studentId = $overrides['studentId'] ?? (string) rand(20240001, 20249999);
        return User::create(array_merge([
            'userId' => 'student-' . $studentId,
            'studentId' => $studentId,
            'name' => 'Test Student ' . $studentId,
            'email' => "student{$studentId}@sejong.ac.kr",
            'passwordHash' => Hash::make('password123'),
            'role' => 'student',
            'department' => 'Computer Science',
            'year' => 2,
            'checkedIn' => false,
            'checkInTime' => null,
            'fcmToken' => 'mock-fcm-token-' . Str::random(10),
        ], $overrides));
    }

    /**
     * Create an admin staff user.
     */
    protected function createAdminUser(array $overrides = []): User
    {
        $adminId = $overrides['studentId'] ?? '00000001';
        return User::create(array_merge([
            'userId' => 'admin-001',
            'studentId' => $adminId,
            'name' => 'Facility Manager',
            'email' => 'manager@sejong.ac.kr',
            'passwordHash' => Hash::make('password123'),
            'role' => 'admin',
            'department' => 'Athletics & Facilities',
            'year' => 4,
            'checkedIn' => false,
            'checkInTime' => null,
            'fcmToken' => null,
        ], $overrides));
    }

    /**
     * Get JWT Authorization headers for a given user.
     */
    protected function getAuthHeaders(User $user): array
    {
        $token = JWTAuth::fromUser($user);
        return [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];
    }
}
