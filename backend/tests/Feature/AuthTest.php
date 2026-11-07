<?php

namespace Tests\Feature;

use Tests\TestCase;

class AuthTest extends TestCase
{
    public function test_student_can_register_successfully(): void
    {
        $payload = [
            'studentId' => '20249876',
            'name' => 'John Doe',
            'email' => 'johndoe@sejong.ac.kr',
            'password' => 'secret123',
            'department' => 'Software Engineering',
            'year' => 2,
        ];

        $response = $this->postJson('/api/auth/register', $payload);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Registration successful.',
            ])
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'user' => [
                        'userId',
                        'studentId',
                        'name',
                        'email',
                        'role',
                        'department',
                        'year',
                        'checkedIn',
                    ]
                ]
            ]);

        $this->assertDatabaseHas('Users', [
            'studentId' => '20249876',
            'email' => 'johndoe@sejong.ac.kr',
        ]);
    }

    public function test_registration_validates_required_fields(): void
    {
        $response = $this->postJson('/api/auth/register', []);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Validation failed.',
            ])
            ->assertJsonValidationErrors(['studentId', 'name', 'email', 'password']);
    }

    public function test_registration_prevents_duplicate_student_id(): void
    {
        $this->createStudentUser(['studentId' => '20241111', 'email' => 'existing@sejong.ac.kr']);

        $payload = [
            'studentId' => '20241111',
            'name' => 'Duplicate Student',
            'email' => 'another@sejong.ac.kr',
            'password' => 'secret123',
        ];

        $response = $this->postJson('/api/auth/register', $payload);
        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'A user with this student ID or email already exists.',
            ]);
    }

    public function test_user_can_login_with_valid_credentials(): void
    {
        $user = $this->createStudentUser(['studentId' => '20241234']);

        $response = $this->postJson('/api/auth/login', [
            'studentId' => '20241234',
            'password' => 'password123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Login successful.',
            ])
            ->assertJsonStructure([
                'data' => [
                    'token',
                    'user' => ['userId', 'studentId', 'role']
                ]
            ]);
    }

    public function test_user_cannot_login_with_invalid_credentials(): void
    {
        $this->createStudentUser(['studentId' => '20241234']);

        $response = $this->postJson('/api/auth/login', [
            'studentId' => '20241234',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401)
            ->assertJson([
                'status' => 'error',
                'message' => 'Invalid student ID or password.',
            ]);
    }

    public function test_authenticated_user_can_fetch_profile(): void
    {
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        $response = $this->getJson('/api/auth/me', $headers);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'studentId' => $user->studentId,
                    'role' => 'student',
                ]
            ]);
    }

    public function test_user_can_update_profile_and_fcm_token(): void
    {
        $user = $this->createStudentUser();
        $headers = $this->getAuthHeaders($user);

        $response = $this->patchJson('/api/users/profile', [
            'department' => 'Artificial Intelligence',
            'year' => 3,
            'fcmToken' => 'fcm-device-token-xyz',
        ], $headers);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'department' => 'Artificial Intelligence',
                    'year' => 3,
                    'hasFcmToken' => true,
                ]
            ]);

        $this->assertDatabaseHas('Users', [
            'userId' => $user->userId,
            'fcmToken' => 'fcm-device-token-xyz',
        ]);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $response = $this->getJson('/api/auth/me');
        $response->assertStatus(401);
    }
}

