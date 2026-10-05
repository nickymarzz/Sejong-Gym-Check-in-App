<?php

namespace App\Models;

use MongoDB\Laravel\Eloquent\Model;
use Illuminate\Auth\Authenticatable;
use Illuminate\Contracts\Auth\Access\Authorizable as AuthorizableContract;
use Illuminate\Contracts\Auth\Authenticatable as AuthenticatableContract;
use Illuminate\Foundation\Auth\Access\Authorizable;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;

class User extends Model implements AuthenticatableContract, AuthorizableContract, JWTSubject
{
    use Authenticatable, Authorizable;

    protected $connection = 'mongodb';
    protected $table = 'Users';
    protected $primaryKey = '_id';

    protected $fillable = [
        'userId',
        'studentId',
        'name',
        'email',
        'passwordHash',
        'role',
        'department',
        'year',
        'checkedIn',
        'checkInTime',
        'fcmToken',
    ];

    protected $casts = [
        'checkedIn' => 'boolean',
        'year' => 'integer',
        'checkInTime' => 'datetime',
        'createdAt' => 'datetime',
        'updatedAt' => 'datetime',
    ];

    protected $hidden = [
        'passwordHash',
    ];

    const CREATED_AT = 'createdAt';
    const UPDATED_AT = 'updatedAt';

    public function getAuthPassword()
    {
        return $this->passwordHash;
    }

    public function getJWTIdentifier()
    {
        return $this->_id;
    }

    public function getJWTCustomClaims()
    {
        return [
            'userId' => $this->userId,
            'studentId' => $this->studentId,
            'role' => $this->role,
            'name' => $this->name,
        ];
    }

    public function checkIns()
    {
        return $this->hasMany(CheckIn::class, 'userId', 'userId');
    }

    public function notifications()
    {
        return $this->hasMany(Notification::class, 'userId', 'userId');
    }
}
