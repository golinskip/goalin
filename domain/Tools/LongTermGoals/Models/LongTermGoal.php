<?php

namespace Domain\Tools\LongTermGoals\Models;

use Database\Factories\LongTermGoalFactory;
use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['goal_period_id', 'goal_category_id', 'title', 'description', 'status', 'review_note', 'sort_order'])]
class LongTermGoal extends Model
{
    /** @use HasFactory<LongTermGoalFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => GoalStatus::class,
            'sort_order' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function goalPeriod(): BelongsTo
    {
        return $this->belongsTo(GoalPeriod::class);
    }

    public function goalCategory(): BelongsTo
    {
        return $this->belongsTo(GoalCategory::class);
    }
}
