<?php

namespace Domain\User\Models;

use Database\Factories\UserSettingFactory;
use Domain\User\Enums\Currency;
use Domain\User\Enums\Ringtone;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['currency', 'multiplier', 'background', 'task_ringtone', 'break_ringtone'])]
class UserSetting extends Model
{
    /** @use HasFactory<UserSettingFactory> */
    use HasFactory;

    /**
     * @var array<string, mixed>
     */
    protected $attributes = [
        'task_ringtone' => 'classic',
        'break_ringtone' => 'classic',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'currency' => Currency::class,
            'multiplier' => 'decimal:2',
            'task_ringtone' => Ringtone::class,
            'break_ringtone' => Ringtone::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
