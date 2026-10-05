<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class DailySummary extends Model
{
    protected $connection = 'mongodb';
    protected $table = 'DailySummaries';
    protected $primaryKey = '_id';

    protected $fillable = [
        'gymId',
        'date',
        'totalVisits',
        'uniqueStudents',
        'peakOccupancy',
        'peakHour',
        'averageDurationMinutes',
        'hourlyBreakdown',
    ];

    protected $casts = [
        'totalVisits' => 'integer',
        'uniqueStudents' => 'integer',
        'peakOccupancy' => 'integer',
        'averageDurationMinutes' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gymId', 'gymId');
    }

    /**
     * @param \MongoDB\Laravel\Eloquent\Builder<static> $query
     * @return \MongoDB\Laravel\Eloquent\Builder<static>
     */
    public function scopeByGymAndDate($query, string $gymId, string $date)
    {
        return $query->where('gymId', $gymId)->where('date', $date);
    }
}
