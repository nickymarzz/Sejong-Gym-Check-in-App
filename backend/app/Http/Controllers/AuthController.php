<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $studentId = $validated['studentId'];
        $password = $validated['password'];

        $user = User::where('studentId', $studentId)->first();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid student ID or password.'
            ], 401);
        }

        if (!Hash::check($password, $user->passwordHash)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Invalid student ID or password.'
            ], 401);
        }

        $token = JWTAuth::fromUser($user);

        return response()->json([
            'status' => 'success',
            'message' => 'Login successful.',
            'data' => [
                'token' => $token,
                'user' => [
                    'userId' => $user->userId,
                    'studentId' => $user->studentId,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'department' => $user->department,
                    'year' => $user->year,
                    'checkedIn' => $user->checkedIn,
                    'checkInTime' => $user->checkInTime?->toIso8601String(),
                ]
            ]
        ], 200);
    }

    public function me(): JsonResponse
    {
        try {
            $user = JWTAuth::parseToken()->authenticate();

            if (!$user) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'User not found.'
                ], 404);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'User retrieved.',
                'data' => [
                    'userId' => $user->userId,
                    'studentId' => $user->studentId,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'department' => $user->department,
                    'year' => $user->year,
                    'checkedIn' => $user->checkedIn,
                    'checkInTime' => $user->checkInTime?->toIso8601String(),
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Token is invalid or expired.'
            ], 401);
        }
    }

    public function logout(): JsonResponse
    {
        try {
            JWTAuth::parseToken()->invalidate(true);

            return response()->json([
                'status' => 'success',
                'message' => 'Logged out successfully.'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to logout. Token may be invalid.'
            ], 401);
        }
    }

    public function refresh(): JsonResponse
    {
        try {
            $token = JWTAuth::parseToken()->refresh();
            $user = JWTAuth::setToken($token)->authenticate();

            return response()->json([
                'status' => 'success',
                'message' => 'Token refreshed.',
                'data' => [
                    'token' => $token,
                    'user' => [
                        'userId' => $user->userId,
                        'studentId' => $user->studentId,
                        'name' => $user->name,
                    ]
                ]
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Token refresh failed.'
            ], 401);
        }
    }
}
