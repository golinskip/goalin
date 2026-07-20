<?php

namespace Domain\Tools\DailyTodo\Models;

use Database\Factories\TodoTaskFactory;
use Domain\Tools\DailyTodo\Enums\TodoPriority;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['parent_id', 'title', 'description', 'links', 'tags', 'estimated_cycles', 'priority', 'due_date', 'completed_at', 'not_done', 'position'])]
class TodoTask extends Model
{
    /** @use HasFactory<TodoTaskFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
            'not_done' => 'boolean',
            'links' => 'array',
            'tags' => 'array',
            'priority' => TodoPriority::class,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    public function subtasks(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position')->orderBy('id');
    }

    public function isCompleted(): bool
    {
        return $this->completed_at !== null;
    }

    public function isNotDone(): bool
    {
        return (bool) $this->not_done;
    }

    public function isSubtask(): bool
    {
        return $this->parent_id !== null;
    }
}
