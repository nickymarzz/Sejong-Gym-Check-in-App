<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateGymRequest;
use App\Models\CheckIn;
use App\Models\DailySummary;
use App\Models\Gym;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function dailySummary(string $gymId, string $date): JsonResponse
    {
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

    public function activeSessions(string $gymId): JsonResponse
    {
        $sessions = CheckIn::active()
            ->forGym($gymId)
            ->orderBy('checkInTime', 'asc')
            ->get();

        $students = User::whereIn('userId', $sessions->pluck('userId')->all())
            ->get()
            ->keyBy('userId');

        $data = $sessions->map(function ($session) use ($students) {
            $student = $students->get($session->userId);

            return [
                'checkInId' => (string) $session->_id,
                'studentId' => $session->studentId,
                'name' => $student?->name,
                'department' => $student?->department,
                'checkInTime' => $session->checkInTime?->toIso8601String(),
                'minutesInside' => $session->checkInTime
                    ? (int) abs($session->checkInTime->diffInMinutes(now()))
                    : null,
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'message' => 'Active sessions retrieved.',
            'data' => $data
        ], 200);
    }

    public function updateGym(UpdateGymRequest $request, string $gymId): JsonResponse
    {
        $gym = Gym::where('gymId', $gymId)->first();

        if (!$gym) {
            return response()->json([
                'status' => 'error',
                'message' => 'Gym not found.'
            ], 404);
        }

        $changes = $request->validated();

        if (empty($changes)) {
            return response()->json([
                'status' => 'error',
                'message' => 'No changes provided.'
            ], 422);
        }

        if (isset($changes['capacity']) && $changes['capacity'] < $gym->currentOccupancy) {
            return response()->json([
                'status' => 'error',
                'message' => 'Capacity cannot be lower than the current occupancy (' . $gym->currentOccupancy . ').'
            ], 422);
        }

        $gym->fill($changes);
        $gym->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Gym settings updated.',
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
}
