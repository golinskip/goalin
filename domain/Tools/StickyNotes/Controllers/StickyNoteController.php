<?php

namespace Domain\Tools\StickyNotes\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\StickyNotes\Models\StickyNote;
use Domain\Tools\StickyNotes\Requests\StoreStickyNoteRequest;
use Domain\Tools\StickyNotes\Requests\UpdateStickyNoteRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class StickyNoteController extends Controller
{
    use AuthorizesRequests;

    public function store(StoreStickyNoteRequest $request): RedirectResponse
    {
        $data = $request->validated();

        $request->user()->stickyNotes()->create([
            'content' => $data['content'],
            'color' => $data['color'] ?? 'yellow',
            'is_important' => $data['is_important'] ?? false,
            'reviewed_on' => today(),
        ]);

        return back();
    }

    /**
     * Any change counts as a review; a changed text keeps the previous one as a revision.
     */
    public function update(UpdateStickyNoteRequest $request, StickyNote $stickyNote): RedirectResponse
    {
        $this->authorize('update', $stickyNote);

        $data = $request->validated();

        if (isset($data['content']) && $data['content'] !== $stickyNote->content) {
            $stickyNote->revisions()->create(['content' => $stickyNote->content]);
        }

        $stickyNote->update([...$data, 'reviewed_on' => today()]);

        return back();
    }

    public function apply(StickyNote $stickyNote): RedirectResponse
    {
        $this->authorize('update', $stickyNote);

        $stickyNote->update([
            'applied_at' => $stickyNote->isApplied() ? null : now(),
            'reviewed_on' => today(),
        ]);

        return back();
    }

    public function stay(StickyNote $stickyNote): RedirectResponse
    {
        $this->authorize('update', $stickyNote);

        $stickyNote->update(['reviewed_on' => today()]);

        return back();
    }

    public function destroy(StickyNote $stickyNote): RedirectResponse
    {
        $this->authorize('delete', $stickyNote);

        $stickyNote->delete();

        return back();
    }
}
