<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CheckInController;
use App\Http\Controllers\GymController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\DashboardController;

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login'])->name('auth.login');
    Route::post('/refresh', [AuthController::class, 'refresh'])->name('auth.refresh');
});

Route::get('/gym/status', [GymController::class, 'status'])->name('gym.status');
Route::get('/gym/status/{gymId}', [GymController::class, 'status'])->name('gym.status.id');
Route::get('/gyms', [GymController::class, 'index'])->name('gyms.index');
Route::get('/gyms/{gymId}', [GymController::class, 'show'])->name('gyms.show');

    Route::middleware(['jwt.auth'])->group(function () {

        Route::prefix('auth')->group(function () {
            Route::get('/me', [AuthController::class, 'me'])->name('auth.me');
            Route::post('/logout', [AuthController::class, 'logout'])->name('auth.logout');
        });

        Route::prefix('checkins')->group(function () {
            Route::post('/', [CheckInController::class, 'store'])->name('checkins.store');
            Route::post('/checkout', [CheckInController::class, 'checkOut'])->name('checkins.checkout');
            Route::get('/history', [CheckInController::class, 'history'])->name('checkins.history');
            Route::get('/active', [CheckInController::class, 'active'])->name('checkins.active');
        });

        Route::prefix('checkouts')->group(function () {
            Route::post('/', [CheckInController::class, 'checkOut'])->name('checkouts.store');
        });

        Route::prefix('notifications')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
            Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('notifications.unreadCount');
            Route::post('/{notificationId}/read', [NotificationController::class, 'markRead'])->name('notifications.markRead');
            Route::post('/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.markAllRead');
        });

        Route::prefix('dashboard')->group(function () {
            Route::get('/gyms/{gymId}/summary/{date}', [DashboardController::class, 'dailySummary'])->name('dashboard.dailySummary');
            Route::get('/gyms/{gymId}/weekly', [DashboardController::class, 'weeklySummary'])->name('dashboard.weeklySummary');
        });

});

Route::fallback(function () {
    return response()->json([
        'status' => 'error',
        'message' => 'Route not found. Check the API endpoint.'
    ], 404);
});
