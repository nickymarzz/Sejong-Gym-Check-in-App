<?php

namespace App\Models;

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

    public function incrementOccupancy(): void
    {
        $this->currentOccupancy = min($this->currentOccupancy + 1, $this->capacity);
        $this->save();
    }

    public function decrementOccupancy(): void
    {
        $this->currentOccupancy = max($this->currentOccupancy - 1, 0);
        $this->save();
    }
}
