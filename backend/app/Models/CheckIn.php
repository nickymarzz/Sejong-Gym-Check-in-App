<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class CheckIn extends Model
{
    protected $connection = 'mongodb';
    protected $table = 'CheckIns';
    protected $primaryKey = '_id';

    protected $fillable = [
        'userId',
        'studentId',
        'gymId',
        'gymName',
        'nfcPayload',
        'checkInTime',
        'checkOutTime',
        'durationMinutes',
        'status',
    ];

    protected $casts = [
        'checkInTime' => 'datetime',
        'checkOutTime' => 'datetime',
        'durationMinutes' => 'integer',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    const STATUS_ACTIVE = 'active';
    const STATUS_COMPLETED = 'completed';
    const STATUS_AUTO_EXPIRED = 'auto_expired';

    public function user()
    {
        return $this->belongsTo(User::class, 'userId', 'userId');
    }

    public function gym()
    {
        return $this->belongsTo(Gym::class, 'gymId', 'gymId');
    }

    /**
     * @param \MongoDB\Laravel\Eloquent\Builder<static> $query
     * @return \MongoDB\Laravel\Eloquent\Builder<static>
     */
    public function scopeActive($query)
    {
        return $query->where('status', self::STATUS_ACTIVE);
    }

    /**
     * @param \MongoDB\Laravel\Eloquent\Builder<static> $query
     * @param string $userId
     * @return \MongoDB\Laravel\Eloquent\Builder<static>
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('userId', $userId);
    }

    /**
     * @param \MongoDB\Laravel\Eloquent\Builder<static> $query
     * @param string $gymId
     * @return \MongoDB\Laravel\Eloquent\Builder<static>
     */
    public function scopeForGym($query, string $gymId)
    {
        return $query->where('gymId', $gymId);
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    public function checkOut(): void
    {
        $now = now();
        $this->checkOutTime = $now;
        if ($this->checkInTime) {
            $this->durationMinutes = max(0, (int) $now->diffInMinutes($this->checkInTime));
        }
        $this->status = self::STATUS_COMPLETED;
        $this->save();
    }

    /**
     * @param \MongoDB\Laravel\Eloquent\Builder<static> $query
     * @param string $date
     * @return \MongoDB\Laravel\Eloquent\Builder<static>
     */
    public function scopeByDate($query, string $date)
    {
        $start = \Illuminate\Support\Carbon::parse($date)->startOfDay();
        $end = \Illuminate\Support\Carbon::parse($date)->endOfDay();
        return $query->whereBetween('checkInTime', [$start, $end]);
    }
}
