<?php

namespace App\Http\Controllers;

use App\Models\DailySummary;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function dailySummary(string $gymId, string $date): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = \Illuminate\Support\Facades\Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        if (!in_array($user->role, ['admin', 'staff'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin or staff role required.'
            ], 403);
        }

        $summary = DailySummary::byGymAndDate($gymId, $date)->first();

        if (!$summary) {
            return response()->json([
                'status' => 'success',
                'message' => 'No summary data for this date.',
                'data' => null
            ], 200);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Daily summary retrieved.',
            'data' => [
                'gymId' => $summary->gymId,
                'date' => $summary->date,
                'totalVisits' => $summary->totalVisits,
                'uniqueStudents' => $summary->uniqueStudents,
                'peakOccupancy' => $summary->peakOccupancy,
                'peakHour' => $summary->peakHour,
                'averageDurationMinutes' => $summary->averageDurationMinutes,
                'hourlyBreakdown' => $summary->hourlyBreakdown,
            ]
        ], 200);
    }

    public function weeklySummary(string $gymId): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = \Illuminate\Support\Facades\Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        if (!in_array($user->role, ['admin', 'staff'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin or staff role required.'
            ], 403);
        }

        $start = now()->subDays(6)->format('Y-m-d');
        $end = now()->format('Y-m-d');

        $summaries = DailySummary::where('gymId', $gymId)
            ->whereBetween('date', [$start, $end])
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($s) {
                return [
                    'date' => $s->date,
                    'totalVisits' => $s->totalVisits,
                    'uniqueStudents' => $s->uniqueStudents,
                    'peakOccupancy' => $s->peakOccupancy,
                    'averageDurationMinutes' => $s->averageDurationMinutes,
                ];
            });

        return response()->json([
            'status' => 'success',
            'message' => 'Weekly summary retrieved.',
            'data' => $summaries
        ], 200);
    }
}
