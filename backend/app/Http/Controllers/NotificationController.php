<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class NotificationController extends Controller
{
    public function index(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        $notifications = Notification::where('userId', $user->userId)
            ->orderBy('sentAt', 'desc')
            ->limit(50)
            ->get()
            ->map(function ($n) {
                return [
                    'id' => (string) $n->_id,
                    'userId' => $n->userId,
                    'title' => $n->title,
                    'body' => $n->body,
                    'type' => $n->type,
                    'data' => $n->data,
                    'read' => $n->read,
                    'timestamp' => $n->sentAt?->toIso8601String(),
                ];
            });

        return response()->json([
            'status' => 'success',
            'message' => 'Notifications retrieved.',
            'data' => $notifications
        ], 200);
    }

    public function unreadCount(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        $count = Notification::unreadForUser($user->userId)->count();

        return response()->json([
            'status' => 'success',
            'message' => 'Unread count retrieved.',
            'data' => $count
        ], 200);
    }

    public function markRead(string $notificationId): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        $notification = Notification::where('_id', $notificationId)
            ->where('userId', $user->userId)
            ->first();

        if (!$notification) {
            return response()->json([
                'status' => 'error',
                'message' => 'Notification not found.'
            ], 404);
        }

        $notification->markAsRead();

        return response()->json([
            'status' => 'success',
            'message' => 'Notification marked as read.'
        ], 200);
    }

    public function markAllRead(): JsonResponse
    {
        /** @var User|null $user */
        $user = Auth::guard()->user();
        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Authentication required.'
            ], 401);
        }

        Notification::unreadForUser($user->userId)->update([
            'read' => true,
            'readAt' => now(),
            'updatedAt' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'All notifications marked as read.'
        ], 200);
    }
}
