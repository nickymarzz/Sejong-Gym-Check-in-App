<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffRole
{
    const STAFF_ROLES = ['admin', 'staff'];

    public function handle(Request $request, Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::guard()->user();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        if (!in_array($user->role, self::STAFF_ROLES, true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin or staff role required.'
            ], 403);
        }

        return $next($request);
    }
}
