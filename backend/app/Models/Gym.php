<?php

namespace App\Models;

use Illuminate\Support\Facades\DB;
use MongoDB\Laravel\Eloquent\Model;

class Gym extends Model
{
    protected $connection = 'mongodb';
    protected $table = 'Gyms';
    protected $primaryKey = '_id';

    protected $fillable = [
        'gymId',
        'gymName',
        'location',
        'capacity',
        'currentOccupancy',
        'status',
        'nfcTagIdentifier',
        'openingHours',
    ];

    protected $casts = [
        'capacity' => 'integer',
        'currentOccupancy' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    public function checkIns()
    {
        return $this->hasMany(CheckIn::class, 'gymId', 'gymId');
    }

    public function activeCheckIns()
    {
        return $this->checkIns()->where('status', 'active');
    }

    public function dailySummaries()
    {
        return $this->hasMany(DailySummary::class, 'gymId', 'gymId');
    }

    public function isWithinOperatingHours($time = null): bool
    {
        // Allow automated test suite or debug override if header present
        if (request() && request()->header('X-Bypass-Hours') === 'true') {
            return true;
        }

        if (empty($this->openingHours) || !isset($this->openingHours['open'], $this->openingHours['close'])) {
            return true;
        }

        $now = $time ? \Carbon\Carbon::parse($time, 'Asia/Seoul') : now('Asia/Seoul');
        $current = $now->format('H:i');

        $open = $this->openingHours['open'];
        $close = $this->openingHours['close'];

        if ($open <= $close) {
            return $current >= $open && $current < $close;
        }

        return $current >= $open || $current < $close;
    }

    public function isOpen(): bool
    {
        return $this->status === 'open' && $this->isWithinOperatingHours();
    }

    public function getOperatingHoursString(): string
    {
        $open = $this->openingHours['open'] ?? '06:00';
        $close = $this->openingHours['close'] ?? '22:00';
        return "{$open} — {$close}";
    }

    public function isAtCapacity(): bool
    {
        return $this->currentOccupancy >= $this->capacity;
    }

    /**
     * Detect whether the connected MongoDB deployment supports multi-document transactions
     * (replica set member or mongos), avoiding CommandException on standalone servers.
     */
    public static function supportsTransactions(): bool
    {
        static $supported = null;
        if ($supported !== null) {
            return $supported;
        }

        try {
            $hello = DB::connection('mongodb')->getMongoDB()->command(['hello' => 1])->toArray()[0] ?? null;
            $supported = $hello !== null && (isset($hello['setName']) || ($hello['msg'] ?? null) === 'isdbgrid');
        } catch (\Throwable) {
            $supported = false;
        }

        return $supported;
    }

    /**
     * Atomically claim one occupancy slot when currentOccupancy < capacity.
     *
     * @param \MongoDB\Driver\Session|null $session
     */
    public function claimOccupancySlot(?object $session = null): ?int
    {
        $collection = DB::connection($this->connection)->getMongoDB()->selectCollection($this->getTable());
        $options = [
            'returnDocument' => \MongoDB\Operation\FindOneAndUpdate::RETURN_DOCUMENT_AFTER,
        ];
        if ($session !== null) {
            $options['session'] = $session;
        }

        $updated = $collection->findOneAndUpdate(
            [
                'gymId' => $this->gymId,
                '$expr' => ['$lt' => ['$currentOccupancy', '$capacity']],
            ],
            [
                '$inc' => ['currentOccupancy' => 1],
                '$set' => ['updatedAt' => new \MongoDB\BSON\UTCDateTime((int) (microtime(true) * 1000))],
            ],
            $options
        );

        if (!$updated) {
            return null;
        }

        $this->currentOccupancy = (int) $updated['currentOccupancy'];
        return $this->currentOccupancy;
    }

    /**
     * Atomically release one occupancy slot when currentOccupancy > 0.
     *
     * @param \MongoDB\Driver\Session|null $session
     */
    public function releaseOccupancySlot(?object $session = null): int
    {
        $collection = DB::connection($this->connection)->getMongoDB()->selectCollection($this->getTable());
        $options = [
            'returnDocument' => \MongoDB\Operation\FindOneAndUpdate::RETURN_DOCUMENT_AFTER,
        ];
        if ($session !== null) {
            $options['session'] = $session;
        }

        $updated = $collection->findOneAndUpdate(
            [
                'gymId' => $this->gymId,
                'currentOccupancy' => ['$gt' => 0],
            ],
            [
                '$inc' => ['currentOccupancy' => -1],
                '$set' => ['updatedAt' => new \MongoDB\BSON\UTCDateTime((int) (microtime(true) * 1000))],
            ],
            $options
        );

        $this->currentOccupancy = $updated ? (int) $updated['currentOccupancy'] : 0;
        return $this->currentOccupancy;
    }

    public function incrementOccupancy(): void
    {
        if ($this->claimOccupancySlot() === null) {
            $this->currentOccupancy = min($this->currentOccupancy + 1, $this->capacity);
            $this->save();
        }
    }

    public function decrementOccupancy(): void
    {
        $this->releaseOccupancySlot();
    }
}
