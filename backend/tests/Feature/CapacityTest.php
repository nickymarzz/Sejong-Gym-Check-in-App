<?php

namespace Tests\Feature;

use Tests\TestCase;

class CapacityTest extends TestCase
{
    public function test_public_capacity_endpoint_returns_occupancy_data(): void
    {
        $this->createTestGym([
            'capacity' => 50,
            'currentOccupancy' => 20,
        ]);

        $response = $this->getJson('/api/capacity');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'gymId' => 'gym-001',
                    'capacity' => 50,
                    'currentOccupancy' => 20,
                    'status' => 'open',
                ]
            ]);
    }

    public function test_capacity_by_gym_id_matches_status_route(): void
    {
        $gym = $this->createTestGym([
            'gymId' => 'gym-sejong-main',
            'capacity' => 100,
            'currentOccupancy' => 35,
        ]);

        $responseCapacity = $this->getJson("/api/capacity/{$gym->gymId}");
        $responseStatus = $this->getJson("/api/gym/status/{$gym->gymId}");

        $responseCapacity->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'data' => [
                    'gymId' => 'gym-sejong-main',
                    'currentOccupancy' => 35,
                    'capacity' => 100,
                ]
            ]);

        $this->assertEquals($responseCapacity->json(), $responseStatus->json());
    }

    public function test_gyms_index_returns_all_facilities(): void
    {
        $this->createTestGym(['gymId' => 'gym-001', 'gymName' => 'Gym A']);
        $this->createTestGym(['gymId' => 'gym-002', 'gymName' => 'Gym B']);

        $response = $this->getJson('/api/gyms');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ]);

        $this->assertCount(2, $response->json('data'));
    }
}
