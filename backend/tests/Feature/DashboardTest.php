<?php

namespace Tests\Feature;

use Tests\TestCase;

class DashboardTest extends TestCase
{
    public function test_non_staff_user_is_forbidden_from_dashboard(): void
    {
        $gym = $this->createTestGym();
        $student = $this->createStudentUser();
        $studentHeaders = $this->getAuthHeaders($student);

        $response = $this->getJson("/api/dashboard/gyms/{$gym->gymId}/weekly", $studentHeaders);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Admin or staff role required.'
            ]);
    }

    public function test_admin_can_access_dashboard_weekly_analytics(): void
    {
        $gym = $this->createTestGym();
        $admin = $this->createAdminUser();
        $adminHeaders = $this->getAuthHeaders($admin);

        $response = $this->getJson("/api/dashboard/gyms/{$gym->gymId}/weekly", $adminHeaders);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Weekly summary retrieved.',
            ])
            ->assertJsonStructure([
                'data'
            ]);
    }

    public function test_admin_can_view_active_occupants(): void
    {
        $gym = $this->createTestGym();
        $student = $this->createStudentUser();
        $studentHeaders = $this->getAuthHeaders($student);

        // Student checks in
        $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $studentHeaders)->assertStatus(201);

        // Admin checks active list
        $admin = $this->createAdminUser();
        $adminHeaders = $this->getAuthHeaders($admin);

        $response = $this->getJson("/api/dashboard/gyms/{$gym->gymId}/active", $adminHeaders);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Active sessions retrieved.',
            ]);

        $activeSessions = $response->json('data');
        $this->assertIsArray($activeSessions);
        $this->assertNotEmpty($activeSessions);
        $this->assertEquals($student->studentId, $activeSessions[0]['studentId']);
    }

    public function test_admin_can_update_gym_settings(): void
    {
        $gym = $this->createTestGym(['capacity' => 50]);
        $admin = $this->createAdminUser();
        $adminHeaders = $this->getAuthHeaders($admin);

        $response = $this->patchJson("/api/dashboard/gyms/{$gym->gymId}/settings", [
            'capacity' => 75,
            'status' => 'open',
        ], $adminHeaders);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Gym settings updated.',
            ]);

        $gym->refresh();
        $this->assertEquals(75, $gym->capacity);
    }
}
