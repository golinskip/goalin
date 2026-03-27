<?php

namespace Domain\Tools\Diary\Controllers;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Domain\Tools\Diary\Models\DiaryEntry;
use Domain\Tools\Diary\Requests\StoreDiaryEntryRequest;
use Domain\Tools\Diary\Requests\UpdateDiaryEntryRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DiaryController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $month = $request->input('month', now()->format('Y-m'));
        $selectedDate = $request->input('date', now()->format('Y-m-d'));

        [$year, $monthNum] = explode('-', $month);
        $startOfMonth = Carbon::createFromDate((int) $year, (int) $monthNum, 1)->startOfMonth();
        $endOfMonth = $startOfMonth->copy()->endOfMonth();

        $entryDates = $user->diaryEntries()
            ->whereBetween('entry_date', [$startOfMonth, $endOfMonth])
            ->pluck('entry_date')
            ->map(fn ($date) => Carbon::parse($date)->format('Y-m-d'))
            ->toArray();

        $selectedEntry = null;
        if ($selectedDate) {
            $entry = $user->diaryEntries()
                ->whereDate('entry_date', $selectedDate)
                ->first();

            if ($entry) {
                $selectedEntry = [
                    'id' => $entry->id,
                    'entry_date' => $entry->entry_date->format('Y-m-d'),
                    'content' => $entry->content,
                    'updated_at' => $entry->updated_at->toISOString(),
                ];
            }
        }

        $totalEntries = $user->diaryEntries()->count();

        return Inertia::render('tools/diary/index', [
            'month' => $month,
            'selectedDate' => $selectedDate,
            'entryDates' => $entryDates,
            'selectedEntry' => $selectedEntry,
            'totalEntries' => $totalEntries,
        ]);
    }

    public function store(StoreDiaryEntryRequest $request): RedirectResponse
    {
        $request->user()->diaryEntries()->create($request->validated());

        $date = $request->validated('entry_date');
        $month = Carbon::parse($date)->format('Y-m');

        return to_route('diary.index', ['month' => $month, 'date' => $date]);
    }

    public function update(UpdateDiaryEntryRequest $request, DiaryEntry $diaryEntry): RedirectResponse
    {
        $this->authorize('update', $diaryEntry);

        $diaryEntry->update($request->validated());

        $month = $diaryEntry->entry_date->format('Y-m');
        $date = $diaryEntry->entry_date->format('Y-m-d');

        return to_route('diary.index', ['month' => $month, 'date' => $date]);
    }

    public function destroy(DiaryEntry $diaryEntry): RedirectResponse
    {
        $this->authorize('delete', $diaryEntry);

        $month = $diaryEntry->entry_date->format('Y-m');

        $diaryEntry->delete();

        return to_route('diary.index', ['month' => $month]);
    }
}
