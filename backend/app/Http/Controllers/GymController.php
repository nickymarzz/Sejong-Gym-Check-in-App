<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class GymController extends Controller
{
    public function index(): JsonResponse
    {
        $gyms = Gym::all()->map(function ($gym) {
            return [
                'gymId' => $gym->gymId,
                'gymName' => $gym->gymName,
                'location' => $gym->location,
                'capacity' => $gym->capacity,
                'currentOccupancy' => $gym->currentOccupancy,
                'status' => $gym->status,
                'nfcTagIdentifier' => $gym->nfcTagIdentifier,
                'openingHours' => $gym->openingHours,
            ];
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Gyms retrieved.',
            'data' => $gyms
        ], 200);
    }

    public function status(string $gymId = 'gym-001'): JsonResponse
    {
        $gym = Gym::where('gymId', $gymId)->first();

        if (!$gym) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gym not found.'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Gym status retrieved.',
            'data' => [
                'gymId' => $gym->gymId,
                'gymName' => $gym->gymName,
                'location' => $gym->location,
                'capacity' => $gym->capacity,
                'currentOccupancy' => $gym->currentOccupancy,
                'status' => $gym->status,
                'nfcTagIdentifier' => $gym->nfcTagIdentifier,
                'openingHours' => $gym->openingHours,
            ]
        ], 200);
    }

    public function show(string $gymId): JsonResponse
    {
        $gym = Gym::where('gymId', $gymId)->first();

        if (!$gym) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gym not found.'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Gym details retrieved.',
            'data' => [
                'gymId' => $gym->gymId,
                'gymName' => $gym->gymName,
                'location' => $gym->location,
                'capacity' => $gym->capacity,
                'currentOccupancy' => $gym->currentOccupancy,
                'status' => $gym->status,
                'nfcTagIdentifier' => $gym->nfcTagIdentifier,
                'openingHours' => $gym->openingHours,
                'createdAt' => $gym->createdAt?->toIso8601String(),
            ]
        ], 200);
    }

    public function stream(string $gymId = 'gym-001'): StreamedResponse
    {
        $response = new StreamedResponse(function () use ($gymId) {
            if (function_exists('set_time_limit')) {
                set_time_limit(0);
            }
            if (function_exists('ignore_user_abort')) {
                ignore_user_abort(false);
            }

            echo "retry: 2500\n\n";
            if (ob_get_level() > 0) ob_flush();
            flush();

            $lastHash = null;
            $start = time();
            $maxLifetime = 180; // 3-minute streaming window before client reconnects

            while (!connection_aborted() && (time() - $start) < $maxLifetime) {
                $gym = Gym::where('gymId', $gymId)->first();

                if ($gym) {
                    $payload = [
                        'gymId' => $gym->gymId,
                        'gymName' => $gym->gymName,
                        'location' => $gym->location,
                        'capacity' => (int) $gym->capacity,
                        'currentOccupancy' => (int) $gym->currentOccupancy,
                        'status' => $gym->status,
                        'nfcTagIdentifier' => $gym->nfcTagIdentifier,
                        'openingHours' => $gym->openingHours,
                        'timestamp' => now()->toIso8601String(),
                    ];

                    $hash = md5(json_encode($payload));

                    if ($hash !== $lastHash) {
                        $lastHash = $hash;
                        echo "event: occupancy\n";
                        echo "data: " . json_encode($payload) . "\n\n";
                    } else {
                        echo ": keepalive\n\n";
                    }

                    if (ob_get_level() > 0) ob_flush();
                    flush();
                }

                sleep(1);
            }
        });

        $response->headers->set('Content-Type', 'text/event-stream');
        $response->headers->set('Cache-Control', 'no-cache, no-transform');
        $response->headers->set('Connection', 'keep-alive');
        $response->headers->set('X-Accel-Buffering', 'no');
        $response->headers->set('Access-Control-Allow-Origin', '*');

        return $response;
    }
}
