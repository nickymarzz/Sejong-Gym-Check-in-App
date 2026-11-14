<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class LatencyBenchmarkTest extends TestCase
{
    const MAX_ALLOWED_LATENCY_MS = 200.0;

    protected function setUp(): void
    {
        parent::setUp();
        // Emulate asynchronous Redis background queue (offloading FCM and DailySummary aggregation)
        Queue::fake();
    }

    /**
     * Week 11 Milestone: Verify capacity query response latency is under 200ms.
     */
    public function test_capacity_query_latency_under_200ms(): void
    {
        $this->createTestGym();

        $start = microtime(true);
        $response = $this->getJson('/api/capacity');
        $durationMs = (microtime(true) - $start) * 1000.0;

        $response->assertStatus(200);
        $this->assertLessThan(
            self::MAX_ALLOWED_LATENCY_MS,
            $durationMs,
            "Capacity endpoint took {$durationMs}ms, exceeding the 200ms requirement."
        );
    }

    /**
     * Week 11 Milestone: Verify NFC check-in response latency is under 200ms.
     */
    public function test_nfc_checkin_latency_under_200ms(): void
    {
        $gym = $this->createTestGym();
        $student = $this->createStudentUser();
        $headers = $this->getAuthHeaders($student);

        $start = microtime(true);
        $response = $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);
        $durationMs = (microtime(true) - $start) * 1000.0;

        $response->assertStatus(201);
        $this->assertLessThan(
            self::MAX_ALLOWED_LATENCY_MS,
            $durationMs,
            "NFC check-in took {$durationMs}ms, exceeding the 200ms requirement."
        );
    }

    /**
     * Week 11 Milestone: Verify NFC checkout response latency is under 200ms.
     */
    public function test_nfc_checkout_latency_under_200ms(): void
    {
        $gym = $this->createTestGym();
        $student = $this->createStudentUser();
        $headers = $this->getAuthHeaders($student);

        // Check in first
        $this->postJson('/api/checkins', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers)->assertStatus(201);

        // Measure checkout latency
        $start = microtime(true);
        $response = $this->postJson('/api/checkins/checkout', [
            'gymId' => $gym->gymId,
            'nfcPayload' => 'SGC-GYM',
        ], $headers);
        $durationMs = (microtime(true) - $start) * 1000.0;

        $response->assertStatus(200);
        $this->assertLessThan(
            self::MAX_ALLOWED_LATENCY_MS,
            $durationMs,
            "NFC check-out took {$durationMs}ms, exceeding the 200ms requirement."
        );
    }

    /**
     * Week 11 Milestone: Benchmark consecutive throughput across multiple requests.
     */
    public function test_average_request_throughput_under_200ms(): void
    {
        $gym = $this->createTestGym();
        $totalDurationMs = 0;
        $iterations = 5;

        for ($i = 0; $i < $iterations; $i++) {
            $student = $this->createStudentUser(['studentId' => '2024' . str_pad($i + 10, 4, '0', STR_PAD_LEFT)]);
            $headers = $this->getAuthHeaders($student);

            $start = microtime(true);
            $this->postJson('/api/checkins', [
                'gymId' => $gym->gymId,
                'nfcPayload' => 'SGC-GYM',
            ], $headers)->assertStatus(201);
            $totalDurationMs += (microtime(true) - $start) * 1000.0;
        }

        $averageMs = $totalDurationMs / $iterations;
        $this->assertLessThan(
            self::MAX_ALLOWED_LATENCY_MS,
            $averageMs,
            "Average check-in latency ({$averageMs}ms) exceeded 200ms."
        );
    }
}

