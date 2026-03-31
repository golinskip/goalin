<?php

namespace Domain\Tools\LongTermGoals\Models;

use Database\Factories\GoalPeriodFactory;
use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['type', 'year', 'month', 'review_comment', 'reviewed_at'])]
class GoalPeriod extends Model
{
    /** @use HasFactory<GoalPeriodFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => GoalPeriodType::class,
            'year' => 'integer',
            'month' => 'integer',
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function longTermGoals(): HasMany
    {
        return $this->hasMany(LongTermGoal::class)->orderBy('sort_order');
    }
}
