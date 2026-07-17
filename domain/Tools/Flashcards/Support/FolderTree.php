<?php

namespace Domain\Tools\Flashcards\Support;

use Domain\Tools\Flashcards\Models\MemoFolder;
use Domain\Tools\Flashcards\Models\MemoSet;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\RedirectResponse;

class FolderTree
{
    /**
     * Props for the memo cards listing, either at the root or inside a folder.
     *
     * @return array<string, mixed>
     */
    public static function listing(User $user, ?MemoFolder $folder): array
    {
        $folders = $user->memoFolders()
            ->where('parent_id', $folder?->id)
            ->withCount(['children', 'memoSets'])
            ->orderBy('name')
            ->get();

        $memoSets = $user->memoSets()
            ->where('memo_folder_id', $folder?->id)
            ->withCount('cards')
            ->latest()
            ->get();

        return [
            'currentFolder' => $folder === null ? null : [
                'id' => $folder->id,
                'name' => $folder->name,
                'color' => $folder->color,
                'parent_id' => $folder->parent_id,
            ],
            'breadcrumb' => self::breadcrumb($folder),
            'folders' => $folders->map(fn (MemoFolder $child) => [
                'id' => $child->id,
                'name' => $child->name,
                'color' => $child->color,
                'folders_count' => $child->children_count,
                'sets_count' => $child->memo_sets_count,
            ]),
            'memoSets' => $memoSets->map(fn (MemoSet $set) => [
                'id' => $set->id,
                'name' => $set->name,
                'description' => $set->description,
                'color' => $set->color,
                'cards_count' => $set->cards_count,
                'updated_at' => $set->updated_at->toISOString(),
            ]),
            'folderOptions' => self::options($user),
        ];
    }

    /**
     * The path from the root down to and including the given folder.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function breadcrumb(?MemoFolder $folder): array
    {
        if ($folder === null) {
            return [];
        }

        return $folder->ancestors()
            ->push($folder)
            ->map(fn (MemoFolder $ancestor) => [
                'id' => $ancestor->id,
                'name' => $ancestor->name,
            ])
            ->values()
            ->all();
    }

    /**
     * Every folder the user owns, labelled with its full path, for move pickers.
     *
     * @return array<int, array<string, mixed>>
     */
    public static function options(User $user): array
    {
        /** @var Collection<int, MemoFolder> $folders */
        $folders = $user->memoFolders()->orderBy('name')->get();

        $byId = $folders->keyBy('id');

        return $folders
            ->map(fn (MemoFolder $folder) => [
                'id' => $folder->id,
                'parent_id' => $folder->parent_id,
                'name' => $folder->name,
                'path' => self::path($folder, $byId),
            ])
            ->sortBy('path', SORT_NATURAL | SORT_FLAG_CASE)
            ->values()
            ->all();
    }

    /**
     * Send the user back to the folder they were browsing, or the root.
     */
    public static function redirectTo(?MemoFolder $folder): RedirectResponse
    {
        return $folder === null
            ? to_route('memo-sets.index')
            : to_route('memo-folders.show', $folder);
    }

    /**
     * @param  Collection<int, MemoFolder>  $byId
     */
    private static function path(MemoFolder $folder, Collection $byId): string
    {
        $segments = [$folder->name];

        for ($current = $folder; $current->parent_id !== null;) {
            $parent = $byId->get($current->parent_id);

            if ($parent === null) {
                break;
            }

            array_unshift($segments, $parent->name);
            $current = $parent;
        }

        return implode(' / ', $segments);
    }
}
