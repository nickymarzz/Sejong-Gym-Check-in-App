<?php

namespace App\Http\Controllers;

use App\Http\Requests\CheckInRequest;
use App\Http\Requests\CheckOutRequest;
use App\Models\CheckIn;
use App\Models\Gym;
use App\Models\User;
use App\Models\Notification;
use App\Jobs\SendFcmNotificationJob;
use App\Jobs\UpdateDailySummaryJob;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\JsonResponse;

class CheckInController extends Controller
{
    const NFC_EXPECTED_PAYLOAD = 'SGC-GYM';

    public function store(CheckInRequest $request): JsonResponse
    {
        try {
            /** @var \App\Models\User|null $user */
            $user = \Illuminate\Support\Facades\Auth::guard()->user();
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Authentication required.'
                ], 401);
            }

            $validated = $request->validated();
            $gymId = $validated['gymId'];
            $nfcPayload = $validated['nfcPayload'];

            if ($nfcPayload !== self::NFC_EXPECTED_PAYLOAD) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'NFC verification failed — expected "' . self::NFC_EXPECTED_PAYLOAD . '" but got "' . $nfcPayload . '"'
                ], 422);
            }

            $session = DB::getMongoClient()->startSession();
            $session->startTransaction();

            try {
                $gym = Gym::where('gymId', $gymId)->first();
                if (!$gym) {
                    $session->abortTransaction();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Gym not found.'
                    ], 404);
                }

                if (!$gym->isOpen()) {
                    $session->abortTransaction();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Gym is currently ' . $gym->status . '.'
                    ], 409);
                }

                if ($gym->isAtCapacity()) {
                    $session->abortTransaction();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Gym is at full capacity. Please wait or try another facility.'
                    ], 409);
                }

                $activeSession = CheckIn::where('userId', $user->userId)
                    ->where('status', CheckIn::STATUS_ACTIVE)
                    ->first();

                if ($activeSession) {
                    $session->abortTransaction();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Already checked in. Please check out first.'
                    ], 409);
                }

                $now = now();

                $gym->incrementOccupancy();

                $checkIn = CheckIn::create([
                    'userId' => $user->userId,
                    'studentId' => $user->studentId,
                    'gymId' => $gym->gymId,
                    'gymName' => $gym->gymName,
                    'nfcPayload' => $nfcPayload,
                    'checkInTime' => $now,
                    'status' => CheckIn::STATUS_ACTIVE,
                ]);

                $user->checkedIn = true;
                $user->checkInTime = $now;
                $user->save();

                $session->commitTransaction();

                $notification = Notification::create([
                    'userId' => $user->userId,
                    'studentId' => $user->studentId,
                    'title' => 'Check-in Confirmed',
                    'body' => 'Welcome to ' . $gym->gymName . '. Enjoy your workout!',
                    'type' => Notification::TYPE_CHECKIN,
                    'data' => [
                        'gymId' => $gym->gymId,
                        'checkInId' => (string) $checkIn->_id,
                    ],
                    'read' => false,
                    'sentAt' => $now,
                ]);

                SendFcmNotificationJob::dispatch($notification, $user);
                UpdateDailySummaryJob::dispatch($gym, $user, $checkIn, 'checkin');

                $updatedGym = [
                    'gymId' => $gym->gymId,
                    'gymName' => $gym->gymName,
                    'location' => $gym->location,
                    'capacity' => $gym->capacity,
                    'currentOccupancy' => $gym->currentOccupancy,
                    'status' => $gym->status,
                    'openingHours' => $gym->openingHours,
                ];

                $updatedUser = [
                    'userId' => $user->userId,
                    'studentId' => $user->studentId,
                    'name' => $user->name,
                    'checkedIn' => $user->checkedIn,
                    'checkInTime' => $user->checkInTime->toIso8601String(),
                ];

                return response()->json([
                    'status' => 'success',
                    'message' => 'Check-in successful.',
                    'data' => [
                        'type' => 'success',
                        'updatedGym' => $updatedGym,
                        'updatedUser' => $updatedUser,
                        'checkIn' => [
                            '_id' => (string) $checkIn->_id,
                            'gymId' => $checkIn->gymId,
                            'gymName' => $checkIn->gymName,
                            'checkInTime' => $checkIn->checkInTime->toIso8601String(),
                            'status' => $checkIn->status,
                        ],
                    ]
                ], 201);

            } catch (\MongoDB\Driver\Exception\RuntimeException $e) {
                if (str_contains($e->getMessage(), 'E11000')) {
                    $session->abortTransaction();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Duplicate check-in detected. Please wait a moment and try again.'
                    ], 409);
                }
                throw $e;
            }

        } catch (\Exception $e) {
            if (isset($session)) {
                try { $session->abortTransaction(); } catch (\Exception $_) {}
            }
            return response()->json([
                'status' => 'error',
                'message' => 'Check-in failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function checkOut(CheckOutRequest $request): JsonResponse
    {
        try {
            /** @var \App\Models\User|null $user */
            $user = \Illuminate\Support\Facades\Auth::guard()->user();
            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Authentication required.'
                ], 401);
            }

            $validated = $request->validated();
            $nfcPayload = $validated['nfcPayload'] ?? null;
            if ($nfcPayload !== null && $nfcPayload !== self::NFC_EXPECTED_PAYLOAD) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'NFC verification failed — expected "' . self::NFC_EXPECTED_PAYLOAD . '" but got "' . $nfcPayload . '"'
                ], 422);
            }

            $session = DB::getMongoClient()->startSession();
            $session->startTransaction();

            try {
                $activeSession = CheckIn::where('userId', $user->userId)
                    ->where('status', CheckIn::STATUS_ACTIVE)
                    ->first();

                if (!$activeSession) {
                    $session->abortTransaction();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'No active check-in session found.'
                    ], 409);
                }

                $gymId = $validated['gymId'] ?? $activeSession->gymId;
                if ($gymId !== $activeSession->gymId) {
                    $session->abortTransaction();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Active check-in belongs to a different gym.'
                    ], 409);
                }

                $gym = Gym::where('gymId', $gymId)->first();
                if (!$gym) {
                    $session->abortTransaction();
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Gym not found.'
                    ], 404);
                }

                $now = now();

                $gym->decrementOccupancy();

                $activeSession->checkOut();

                $user->checkedIn = false;
                $user->checkInTime = null;
                $user->save();

                $session->commitTransaction();

                $notification = Notification::create([
                    'userId' => $user->userId,
                    'studentId' => $user->studentId,
                    'title' => 'Check-out Confirmed',
                    'body' => 'Thanks for visiting ' . $gym->gymName . '. Duration: ' . ($activeSession->durationMinutes ?? 0) . ' min. Great job!',
                    'type' => Notification::TYPE_CHECKOUT,
                    'data' => [
                        'gymId' => $gym->gymId,
                        'checkInId' => (string) $activeSession->_id,
                        'durationMinutes' => $activeSession->durationMinutes,
                    ],
                    'read' => false,
                    'sentAt' => $now,
                ]);

                SendFcmNotificationJob::dispatch($notification, $user);
                UpdateDailySummaryJob::dispatch($gym, $user, $activeSession, 'checkout');

                $updatedGym = [
                    'gymId' => $gym->gymId,
                    'gymName' => $gym->gymName,
                    'location' => $gym->location,
                    'capacity' => $gym->capacity,
                    'currentOccupancy' => $gym->currentOccupancy,
                    'status' => $gym->status,
                    'openingHours' => $gym->openingHours,
                ];

                $updatedUser = [
                    'userId' => $user->userId,
                    'studentId' => $user->studentId,
                    'name' => $user->name,
                    'checkedIn' => false,
                    'checkInTime' => null,
                    'lastCheckOutAt' => $activeSession->checkOutTime?->toIso8601String(),
                ];

                return response()->json([
                    'status' => 'success',
                    'message' => 'Check-out successful.',
                    'data' => [
                        'type' => 'success',
                        'updatedGym' => $updatedGym,
                        'updatedUser' => $updatedUser,
                        'checkIn' => [
                            '_id' => (string) $activeSession->_id,
                            'gymId' => $activeSession->gymId,
                            'gymName' => $activeSession->gymName,
                            'checkInTime' => $activeSession->checkInTime->toIso8601String(),
                            'checkOutTime' => $activeSession->checkOutTime->toIso8601String(),
                            'durationMinutes' => $activeSession->durationMinutes,
                            'status' => $activeSession->status,
                        ],
                    ]
                ], 200);

            } catch (\Exception $e) {
                $session->abortTransaction();
                throw $e;
            }

        } catch (\Exception $e) {
            if (isset($session)) {
                try { $session->abortTransaction(); } catch (\Exception $_) {}
            }
            return response()->json([
                'status' => 'error',
                'message' => 'Check-out failed: ' . $e->getMessage()
            ], 500);
        }
    }

    public function history(): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = \Illuminate\Support\Facades\Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        $history = CheckIn::where('userId', $user->userId)
            ->orderBy('checkInTime', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($ci) {
                return [
                    '_id' => (string) $ci->_id,
                    'gymId' => $ci->gymId,
                    'gymName' => $ci->gymName,
                    'checkInTime' => $ci->checkInTime?->toIso8601String(),
                    'checkOutTime' => $ci->checkOutTime?->toIso8601String(),
                    'durationMinutes' => $ci->durationMinutes,
                    'status' => $ci->status,
                ];
            });

        return response()->json([
            'status' => 'success',
            'message' => 'Check-in history retrieved.',
            'data' => $history
        ], 200);
    }

    public function active(): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = \Illuminate\Support\Facades\Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        $active = CheckIn::where('userId', $user->userId)
            ->where('status', CheckIn::STATUS_ACTIVE)
            ->first();

        if (!$active) {
            return response()->json([
                'status' => 'success',
                'message' => 'No active check-in session.',
                'data' => null
            ], 200);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Active session retrieved.',
            'data' => [
                '_id' => (string) $active->_id,
                'gymId' => $active->gymId,
                'gymName' => $active->gymName,
                'checkInTime' => $active->checkInTime?->toIso8601String(),
                'status' => $active->status,
            ]
        ], 200);
    }
}
