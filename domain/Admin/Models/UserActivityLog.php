<?php

namespace Domain\Admin\Models;

use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['user_id', 'session_id', 'ip_address', 'user_agent', 'login_at', 'request_count', 'last_request_at'])]
class UserActivityLog extends Model
{
    protected function casts(): array
    {
        return [
            'login_at' => 'datetime',
            'last_request_at' => 'datetime',
            'request_count' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
