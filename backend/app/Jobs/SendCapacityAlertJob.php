<?php

namespace App\Jobs;

use App\Models\Gym;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;

class SendCapacityAlertJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public Gym $gym;
    public int $percent;
    public int $occupancy;
    public int $capacity;

    public function __construct(Gym $gym, int $percent, int $occupancy, int $capacity)
    {
        $this->gym = $gym;
        $this->percent = $percent;
        $this->occupancy = $occupancy;
        $this->capacity = $capacity;
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        $thresholdTier = $this->percent >= 100 ? 100 : 80;
        $cacheKey = "sgc:capacity_alert:{$this->gym->gymId}:{$thresholdTier}";

        if (Cache::has($cacheKey)) {
            return;
        }
        Cache::put($cacheKey, true, now()->addMinutes(30));

        $title = $thresholdTier >= 100
            ? 'Gym at Full Capacity (100%)'
            : "Gym High Occupancy Alert ({$this->percent}%)";

        $body = $thresholdTier >= 100
            ? "{$this->gym->gymName} is now at max capacity ({$this->occupancy}/{$this->capacity} spots). Entry may be temporarily queued."
            : "{$this->gym->gymName} is now at {$this->percent}% capacity ({$this->occupancy}/{$this->capacity} spots filled). Expect wait times for popular equipment.";

        $now = now();

        $users = User::whereNotNull('fcmToken')
            ->where('fcmToken', '!=', '')
            ->get();

        foreach ($users as $user) {
            $notification = Notification::create([
                'userId' => $user->userId,
                'studentId' => $user->studentId,
                'title' => $title,
                'body' => $body,
                'type' => Notification::TYPE_CAPACITY,
                'data' => [
                    'gymId' => $this->gym->gymId,
                    'occupancy' => $this->occupancy,
                    'capacity' => $this->capacity,
                    'percent' => $this->percent,
                ],
                'read' => false,
                'sentAt' => $now,
            ]);

            SendFcmNotificationJob::dispatch($notification, $user);
        }
    }
}
