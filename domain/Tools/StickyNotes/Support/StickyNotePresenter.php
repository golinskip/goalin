<?php

namespace Domain\Tools\StickyNotes\Support;

use Domain\Tools\StickyNotes\Models\StickyNote;
use Domain\Tools\StickyNotes\Models\StickyNoteRevision;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * @phpstan-type NotePayload array{
 *     id: int,
 *     content: string,
 *     color: string,
 *     is_important: bool,
 *     is_applied: bool,
 *     needs_review: bool,
 *     reviewed_on: string,
 *     applied_at: string|null,
 *     created_at: string,
 *     revisions: list<array{id: int, content: string, created_at: string}>
 * }
 */
class StickyNotePresenter
{
    /**
     * Open notes, shown in the top-bar quick access panel: important first, then newest.
     *
     * @return list<NotePayload>
     */
    public static function activeForUser(User $user): array
    {
        return self::present(
            $user->stickyNotes()->active()->with('revisions')
                ->orderByDesc('is_important')->latest()->latest('id')->get()
        );
    }

    /**
     * Notes already marked as applied, most recently applied first.
     *
     * @return list<NotePayload>
     */
    public static function appliedForUser(User $user): array
    {
        return self::present(
            $user->stickyNotes()->whereNotNull('applied_at')->with('revisions')
                ->latest('applied_at')->latest('id')->get()
        );
    }

    /**
     * @param  Collection<int, StickyNote>  $notes
     * @return list<NotePayload>
     */
    private static function present(Collection $notes): array
    {
        return $notes->map(fn (StickyNote $note): array => [
            'id' => $note->id,
            'content' => $note->content,
            'color' => $note->color->value,
            'is_important' => $note->is_important,
            'is_applied' => $note->isApplied(),
            'needs_review' => $note->needsReview(),
            'reviewed_on' => $note->reviewed_on->toDateString(),
            'applied_at' => $note->applied_at?->toIso8601String(),
            'created_at' => $note->created_at->toIso8601String(),
            'revisions' => $note->revisions->map(fn (StickyNoteRevision $revision): array => [
                'id' => $revision->id,
                'content' => $revision->content,
                'created_at' => $revision->created_at->toIso8601String(),
            ])->values()->all(),
        ])->values()->all();
    }
}
