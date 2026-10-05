<?php

namespace App\Http\Controllers;

use App\Models\Gym;
use Illuminate\Http\JsonResponse;

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
}
