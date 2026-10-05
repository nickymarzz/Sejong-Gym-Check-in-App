<?php

namespace App\Jobs;

use App\Models\Gym;
use App\Models\User;
use App\Models\CheckIn;
use App\Models\DailySummary;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class UpdateDailySummaryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** @var Gym */
    public $gym;
    /** @var User */
    public $user;
    /** @var CheckIn */
    public $checkIn;
    /** @var string */
    public $action;
    public $tries = 3;
    public $backoff = [30, 60, 120];

    public function __construct(Gym $gym, User $user, CheckIn $checkIn, string $action)
    {
        $this->gym = $gym;
        $this->user = $user;
        $this->checkIn = $checkIn;
        $this->action = $action;
        $this->onQueue('analytics');
    }

    public function handle(): void
    {
        $date = now()->format('Y-m-d');
        $hourBucket = now()->format('H:00');

        try {
            $session = DB::getMongoClient()->startSession();
            $session->startTransaction();

            try {
                $summary = DailySummary::byGymAndDate($this->gym->gymId, $date)->first();

                if (!$summary) {
                    $hourlyBreakdown = [];
                    for ($h = 6; $h <= 22; $h++) {
                        $hourlyBreakdown[] = [
                            'hour' => str_pad((string) $h, 2, '0', STR_PAD_LEFT) . ':00',
                            'visits' => 0,
                            'occupancy' => 0,
                        ];
                    }

                    $summary = DailySummary::create([
                        'gymId' => $this->gym->gymId,
                        'date' => $date,
                        'totalVisits' => 0,
                        'uniqueStudents' => 0,
                        'peakOccupancy' => 0,
                        'peakHour' => null,
                        'averageDurationMinutes' => 0,
                        'hourlyBreakdown' => $hourlyBreakdown,
                    ]);
                }

                if ($this->action === 'checkin') {
                    $summary->totalVisits += 1;

                    $todayCheckIns = CheckIn::where('gymId', $this->gym->gymId)
                        ->byDate($date)
                        ->distinct('studentId')
                        ->count('studentId');
                    $summary->uniqueStudents = $todayCheckIns;

                    if ($this->gym->currentOccupancy > $summary->peakOccupancy) {
                        $summary->peakOccupancy = $this->gym->currentOccupancy;
                        $summary->peakHour = $hourBucket;
                    }

                    $hourly = $summary->hourlyBreakdown;
                    foreach ($hourly as &$h) {
                        if ($h['hour'] === $hourBucket) {
                            $h['visits'] += 1;
                            $h['occupancy'] = $this->gym->currentOccupancy;
                        }
                    }
                    $summary->hourlyBreakdown = $hourly;

                } elseif ($this->action === 'checkout') {
                    $durations = CheckIn::where('gymId', $this->gym->gymId)
                        ->byDate($date)
                        ->where('status', CheckIn::STATUS_COMPLETED)
                        ->pluck('durationMinutes')
                        ->filter()
                        ->values()
                        ->toArray();

                    if (!empty($durations)) {
                        $summary->averageDurationMinutes = (int) round(array_sum($durations) / count($durations));
                    }

                    $hourly = $summary->hourlyBreakdown;
                    foreach ($hourly as &$h) {
                        if ($h['hour'] === $hourBucket) {
                            $h['occupancy'] = $this->gym->currentOccupancy;
                        }
                    }
                    $summary->hourlyBreakdown = $hourly;
                }

                $summary->save();
                $session->commitTransaction();
                Log::info("DailySummary updated: {$this->gym->gymId}/{$date} action={$this->action}");

            } catch (\Exception $e) {
                $session->abortTransaction();
                throw $e;
            }
        } catch (\Exception $e) {
            Log::error('DailySummary update failed: ' . $e->getMessage());
        }
    }
}
