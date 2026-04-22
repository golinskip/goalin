<?php

namespace Domain\ExternalServices\Models;

use Domain\ExternalServices\Enums\ServiceType;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['service', 'access_token', 'refresh_token', 'expires_at', 'metadata'])]
class ServiceConnection extends Model
{
    protected function casts(): array
    {
        return [
            'service' => ServiceType::class,
            'access_token' => 'encrypted',
            'refresh_token' => 'encrypted',
            'expires_at' => 'datetime',
            'metadata' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }
}
