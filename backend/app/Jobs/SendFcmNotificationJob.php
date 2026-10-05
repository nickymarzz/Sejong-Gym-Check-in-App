<?php

namespace App\Jobs;

use App\Models\Notification as NotificationRecord;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Kreait\Firebase\Factory;
use Kreait\Firebase\Messaging\AndroidConfig;
use Kreait\Firebase\Messaging\ApnsConfig;
use Kreait\Firebase\Messaging\CloudMessage;
use Kreait\Firebase\Messaging\Notification as FcmNotification;

class SendFcmNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var NotificationRecord */
    public $notification;
    /** @var User */
    public $user;
    public $tries = 3;
    public $backoff = [30, 60, 120];

    public function __construct(NotificationRecord $notification, User $user)
    {
        $this->notification = $notification;
        $this->user = $user;
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        if (empty($this->user->fcmToken)) {
            Log::info('FCM: No token for user ' . $this->user->userId . ', skipping push.');
            return;
        }

        $credentialsPath = config('services.firebase.credentials');
        $title = (string) ($this->notification->title ?? 'Sejong Gym');
        $body = (string) ($this->notification->body ?? '');
        if (empty($credentialsPath) || !file_exists($credentialsPath)) {
            Log::info('FCM: Service account missing at ' . ($credentialsPath ?? '(unset)') . '. Stored notification only: ' . $title);
            return;
        }

        try {
            if (class_exists(Factory::class)) {
                $factory = (new Factory())->withServiceAccount($credentialsPath);
                $messaging = $factory->createMessaging();

                $apns = ApnsConfig::new()->withSound('default')->withBadge(1);
                $androidConfig = AndroidConfig::new();
                if (method_exists($androidConfig, 'setPriority')) {
                    $androidConfig = $androidConfig->setPriority('high');
                }
                if (class_exists('Kreait\Firebase\Messaging\AndroidNotification')) {
                    $androidN = \Kreait\Firebase\Messaging\AndroidNotification::new()
                        ->withSound('default')
                        ->withClickAction('MAIN_ACTIVITY');
                    if (method_exists($androidConfig, 'setNotification')) {
                        $androidConfig = $androidConfig->setNotification($androidN);
                    }
                }

                /** @var CloudMessage $message */
                $message = CloudMessage::fromArray([
                    'token' => $this->user->fcmToken,
                ])
                    ->withNotification(FcmNotification::create($title, $body))
                    ->withData(array_merge($this->notification->data ?? [], [
                        'notificationId' => (string) ($this->notification->_id ?? ''),
                        'type' => (string) ($this->notification->type ?? ''),
                        'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
                    ]))
                    ->withApnsConfig($apns)
                    ->withAndroidConfig($androidConfig);

                $messaging->send($message);
                Log::info('FCM: Sent to user ' . $this->user->userId);
            } else {
                Log::info('FCM: Firebase SDK not installed. Stored notification only: ' . $title);
            }
        } catch (\Exception $e) {
            Log::error('FCM send failed for user ' . $this->user->userId . ': ' . $e->getMessage());
        }
    }
}
