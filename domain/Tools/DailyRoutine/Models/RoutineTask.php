<?php

namespace Domain\Tools\DailyRoutine\Models;

use Carbon\CarbonImmutable;
use Database\Factories\RoutineTaskFactory;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'color', 'weekdays', 'starts_on', 'ends_on'])]
class RoutineTask extends Model
{
    /** @use HasFactory<RoutineTaskFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'weekdays' => 'array',
            'starts_on' => 'date',
            'ends_on' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(RoutineTaskLog::class);
    }

    /**
     * Whether the task is scheduled for the given date (within range and matching weekday).
     */
    public function isScheduledOn(CarbonImmutable $date): bool
    {
        if ($date->lt($this->starts_on) || $date->gt($this->ends_on)) {
            return false;
        }

        /** @var array<int, int> $weekdays */
        $weekdays = $this->weekdays ?? [];

        return in_array($date->dayOfWeekIso, $weekdays, true);
    }
}
