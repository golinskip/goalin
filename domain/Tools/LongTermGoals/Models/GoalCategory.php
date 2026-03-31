<?php

namespace Domain\Tools\LongTermGoals\Models;

use Database\Factories\GoalCategoryFactory;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'color', 'sort_order'])]
class GoalCategory extends Model
{
    /** @use HasFactory<GoalCategoryFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::addGlobalScope('ordered', function (Builder $builder) {
            $builder->orderBy('sort_order');
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function longTermGoals(): HasMany
    {
        return $this->hasMany(LongTermGoal::class);
    }
}
