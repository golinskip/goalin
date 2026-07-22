<?php

namespace Domain\Tools\TaskMindmap\Models;

use Database\Factories\MindmapTaskFactory;
use Domain\Tools\TaskMindmap\Enums\TaskPriority;
use Domain\Tools\TaskMindmap\Enums\TaskStatus;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['parent_id', 'title', 'description', 'links', 'tags', 'color', 'icon', 'priority', 'deadline', 'status', 'position'])]
class MindmapTask extends Model
{
    /** @use HasFactory<MindmapTaskFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'links' => 'array',
            'tags' => 'array',
            'deadline' => 'date',
            'priority' => TaskPriority::class,
            'status' => TaskStatus::class,
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

    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->orderBy('position')->orderBy('id');
    }
}
