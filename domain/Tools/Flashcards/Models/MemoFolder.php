<?php

namespace Domain\Tools\Flashcards\Models;

use Database\Factories\MemoFolderFactory;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

#[Fillable(['name', 'color', 'parent_id'])]
class MemoFolder extends Model
{
    /** @use HasFactory<MemoFolderFactory> */
    use HasFactory;

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
        return $this->hasMany(self::class, 'parent_id');
    }

    public function memoSets(): HasMany
    {
        return $this->hasMany(MemoSet::class);
    }

    /**
     * The chain of folders from the root down to (and excluding) this folder.
     *
     * @return Collection<int, MemoFolder>
     */
    public function ancestors(): Collection
    {
        $ancestors = new Collection;

        for ($folder = $this->parent; $folder !== null; $folder = $folder->parent) {
            $ancestors->prepend($folder);
        }

        return $ancestors;
    }

    /**
     * Whether the given folder sits somewhere beneath this one, which would make
     * moving this folder into it detach the subtree from the root.
     */
    public function hasDescendant(self $folder): bool
    {
        for ($current = $folder->parent; $current !== null; $current = $current->parent) {
            if ($current->id === $this->id) {
                return true;
            }
        }

        return false;
    }

    public function isEmpty(): bool
    {
        return ! $this->children()->exists() && ! $this->memoSets()->exists();
    }
}
