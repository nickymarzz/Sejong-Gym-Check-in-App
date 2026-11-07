<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class UserController extends Controller
{
    /**
     * Get current authenticated user profile.
     */
    public function profile(): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'User profile retrieved.',
            'data' => [
                'userId' => $user->userId,
                'studentId' => $user->studentId,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'department' => $user->department,
                'year' => $user->year,
                'checkedIn' => (bool) $user->checkedIn,
                'checkInTime' => $user->checkInTime?->toIso8601String(),
                'hasFcmToken' => !empty($user->fcmToken),
            ]
        ], 200);
    }

    /**
     * Update current authenticated user profile details / FCM token.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        $validated = $request->validate([
            'name' => 'sometimes|string|max:100',
            'department' => 'sometimes|string|max:100',
            'year' => 'sometimes|integer|min:1|max:6',
            'fcmToken' => 'sometimes|nullable|string|max:500',
        ]);

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['department'])) {
            $user->department = $validated['department'];
        }
        if (isset($validated['year'])) {
            $user->year = (int) $validated['year'];
        }
        if (array_key_exists('fcmToken', $validated)) {
            $user->fcmToken = $validated['fcmToken'];
        }

        $user->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Profile updated successfully.',
            'data' => [
                'userId' => $user->userId,
                'studentId' => $user->studentId,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'department' => $user->department,
                'year' => $user->year,
                'checkedIn' => (bool) $user->checkedIn,
                'hasFcmToken' => !empty($user->fcmToken),
            ]
        ], 200);
    }

    /**
     * List users (staff/admin or general).
     */
    public function index(Request $request): JsonResponse
    {
        /** @var \App\Models\User|null $currentUser */
        $currentUser = Auth::guard()->user();
        $isStaff = $currentUser && in_array($currentUser->role, ['admin', 'staff'], true);

        $query = User::query();

        if ($request->has('role')) {
            $query->where('role', $request->query('role'));
        }
        if ($request->has('search')) {
            $search = (string) $request->query('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('studentId', 'like', "%{$search}%");
            });
        }

        $limit = min((int) ($request->query('limit', 20)), 100);
        $users = $query->limit($limit)->get();

        $data = $users->map(function ($u) use ($isStaff) {
            $item = [
                'userId' => $u->userId,
                'studentId' => $u->studentId,
                'name' => $u->name,
                'role' => $u->role,
                'department' => $u->department,
                'year' => $u->year,
                'checkedIn' => (bool) $u->checkedIn,
            ];
            if ($isStaff) {
                $item['email'] = $u->email;
                $item['checkInTime'] = $u->checkInTime?->toIso8601String();
            }
            return $item;
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
            'count' => count($data),
        ], 200);
    }

    /**
     * Get single user by ID.
     */
    public function show(string $userId): JsonResponse
    {
        $user = User::where('userId', $userId)->orWhere('studentId', $userId)->first();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'User not found.'
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => [
                'userId' => $user->userId,
                'studentId' => $user->studentId,
                'name' => $user->name,
                'role' => $user->role,
                'department' => $user->department,
                'year' => $user->year,
                'checkedIn' => (bool) $user->checkedIn,
            ]
        ], 200);
    }
}

