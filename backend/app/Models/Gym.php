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

    public function isOpen(): bool
    {
        return $this->status === 'open';
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
