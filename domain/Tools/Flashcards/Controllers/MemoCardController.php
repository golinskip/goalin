<?php

namespace Domain\Tools\Flashcards\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\Flashcards\Models\MemoCard;
use Domain\Tools\Flashcards\Models\MemoSet;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class MemoCardController extends Controller
{
    use AuthorizesRequests;

    public function store(Request $request, MemoSet $memoSet): RedirectResponse
    {
        $this->authorize('update', $memoSet);

        $data = $request->validate([
            'front' => ['required', 'string', 'max:2000'],
            'back' => ['required', 'string', 'max:2000'],
        ]);

        $memoSet->cards()->create($data);

        return to_route('memo-sets.show', $memoSet);
    }

    public function update(Request $request, MemoCard $memoCard): RedirectResponse
    {
        $this->authorize('update', $memoCard->memoSet);

        $data = $request->validate([
            'front' => ['required', 'string', 'max:2000'],
            'back' => ['required', 'string', 'max:2000'],
        ]);

        $memoCard->update($data);

        return to_route('memo-sets.show', $memoCard->memo_set_id);
    }

    public function destroy(MemoCard $memoCard): RedirectResponse
    {
        $this->authorize('update', $memoCard->memoSet);

        $memoSetId = $memoCard->memo_set_id;
        $memoCard->delete();

        return to_route('memo-sets.show', $memoSetId);
    }

    public function review(Request $request, MemoCard $memoCard): RedirectResponse
    {
        $this->authorize('update', $memoCard->memoSet);

        $data = $request->validate([
            'correct' => ['required', 'boolean'],
        ]);

        if ($data['correct']) {
            $memoCard->increment('correct_count');
        } else {
            $memoCard->increment('incorrect_count');
        }

        $memoCard->update(['last_reviewed_at' => now()]);

        return back();
    }
}
