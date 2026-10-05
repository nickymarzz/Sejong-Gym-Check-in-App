<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;

class Notification extends Model
{
    protected $connection = 'mongodb';
    protected $table = 'Notifications';
    protected $primaryKey = '_id';

    protected $fillable = [
        'userId',
        'studentId',
        'title',
        'body',
        'type',
        'data',
        'read',
        'readAt',
        'sentAt',
    ];

    protected $casts = [
        'read' => 'boolean',
        'readAt' => 'datetime',
        'sentAt' => 'datetime',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    const TYPE_CHECKIN = 'checkin';
    const TYPE_CHECKOUT = 'checkout';
    const TYPE_CAPACITY = 'capacity';
    const TYPE_REMINDER = 'reminder';
    const TYPE_SYSTEM = 'system';

    public function user()
    {
        return $this->belongsTo(User::class, 'userId', 'userId');
    }

    /**
     * @param \MongoDB\Laravel\Eloquent\Builder<static> $query
     * @return \MongoDB\Laravel\Eloquent\Builder<static>
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('userId', $userId);
    }

    /**
     * @param \MongoDB\Laravel\Eloquent\Builder<static> $query
     * @return \MongoDB\Laravel\Eloquent\Builder<static>
     */
    public function scopeUnread($query)
    {
        return $query->where('read', false);
    }

    /**
     * @param \MongoDB\Laravel\Eloquent\Builder<static> $query
     * @return \MongoDB\Laravel\Eloquent\Builder<static>
     */
    public function scopeUnreadForUser($query, string $userId)
    {
        return $query->forUser($userId)->unread();
    }

    public function markAsRead(): void
    {
        $this->read = true;
        $this->readAt = now();
        $this->save();
    }
}
