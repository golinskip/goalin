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
                    'fields' => $entry->fields ?? [],
                    'updated_at' => $entry->updated_at->toISOString(),
                ];
            }
        }

        $totalEntries = $user->diaryEntries()->count();

        /** @var array<string, string[]> $fieldSuggestions */
        $fieldSuggestions = [];
        $user->diaryEntries()
            ->whereNotNull('fields')
            ->pluck('fields')
            ->each(function (array $fields) use (&$fieldSuggestions): void {
                foreach ($fields as $field) {
                    $label = $field['label'] ?? '';
                    $value = $field['value'] ?? '';
                    if ($label !== '') {
                        $fieldSuggestions[$label][] = $value;
                    }
                }
            });

        foreach ($fieldSuggestions as $label => $values) {
            $fieldSuggestions[$label] = array_values(array_unique(array_filter($values)));
        }

        return Inertia::render('tools/diary/index', [
            'month' => $month,
            'selectedDate' => $selectedDate,
            'entryDates' => $entryDates,
            'selectedEntry' => $selectedEntry,
            'totalEntries' => $totalEntries,
            'fieldSuggestions' => $fieldSuggestions,
        ]);
    }

    public function table(Request $request): Response
    {
        $user = $request->user();
        $year = (int) $request->input('year', now()->year);

        $startOfYear = Carbon::createFromDate($year, 1, 1)->startOfYear();
        $endOfYear = $startOfYear->copy()->endOfYear();

        $entries = $user->diaryEntries()
            ->whereBetween('entry_date', [$startOfYear, $endOfYear])
            ->orderBy('entry_date')
            ->get()
            ->map(fn (DiaryEntry $entry) => [
                'id' => $entry->id,
                'entry_date' => $entry->entry_date->format('Y-m-d'),
                'content' => $entry->content,
                'fields' => $entry->fields ?? [],
            ]);

        return Inertia::render('tools/diary/table', [
            'year' => $year,
            'entries' => $entries,
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
