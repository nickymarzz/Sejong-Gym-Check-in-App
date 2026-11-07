<?php

namespace Tests\Feature;

use Tests\TestCase;

class SecurityAuditTest extends TestCase
{
    /**
     * NFR-2 & Week 12: Verify NoSQL operator injection in Login is rejected before reaching DB.
     */
    public function test_nosql_injection_in_login_is_rejected(): void
    {
        $this->createStudentUser(['studentId' => '20241234']);

        // Attempt MongoDB query operator injection via array payload
        $response = $this->postJson('/api/auth/login', [
            'studentId' => ['$ne' => null],
            'password' => ['$gt' => ''],
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Validation failed.',
            ]);
    }

    /**
     * NFR-2 & Week 12: Verify NoSQL operator injection in Registration is rejected.
     */
    public function test_nosql_injection_in_registration_is_rejected(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'studentId' => ['$regex' => '.*'],
            'name' => ['$ne' => ''],
            'email' => 'hacker@sejong.ac.kr',
            'password' => 'secret123',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Validation failed.',
            ]);
    }

    /**
     * NFR-2 & Week 12: Verify arbitrary/tampered NFC tag payloads are rejected.
     */
    public function test_unauthorized_nfc_payload_tampering_is_rejected(): void
    {
        $gym = $this->createTestGym();
        $student = $this->createStudentUser();
        $headers = $this->getAuthHeaders($student);

        // Attempt check-in with cloned or forged NFC payload
        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'CLONED-NFC-TAG-999',
        ], $headers);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
            ]);
    }

    /**
     * NFR-2 & Week 12: Verify XSS/HTML script payloads in profile updates are safely handled.
     */
    public function test_xss_injection_payload_in_profile_update_is_safely_handled(): void
    {
        $student = $this->createStudentUser();
        $headers = $this->getAuthHeaders($student);

        $xssPayload = '<script>alert("XSS")</script>Computer Science';

        $response = $this->patchJson('/api/users/profile', [
            'department' => $xssPayload,
        ], $headers);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertDatabaseHas('Users', [
            'userId' => $student->userId,
            'department' => $xssPayload,
        ]);
    }

    /**
     * NFR-2 & Week 12: Verify rate-limiting on sensitive authentication routes.
     */
    public function test_auth_route_enforces_rate_limiting_throttle(): void
    {
        // Rate limit on /api/auth/* is throttle:30,1 (30 requests per minute)
        for ($i = 0; $i < 30; $i++) {
            $this->postJson('/api/auth/login', [
                'studentId' => '20240000',
                'password' => 'wrongpass',
            ]);
        }

        // The 31st request from the same client IP must be throttled with HTTP 429
        $throttledResponse = $this->postJson('/api/auth/login', [
            'studentId' => '20240000',
            'password' => 'wrongpass',
        ]);

        $throttledResponse->assertStatus(429);
    }
}

