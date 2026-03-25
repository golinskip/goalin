<?php

namespace App\Http\Controllers\Tools;

use App\Http\Controllers\Controller;
use App\Http\Requests\MemoSet\StoreMemoSetRequest;
use App\Http\Requests\MemoSet\UpdateMemoSetRequest;
use App\Models\MemoCard;
use App\Models\MemoSet;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class MemoSetController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('tools/memo-sets/index', [
            'memoSets' => $user->memoSets()->withCount('cards')->latest()->get()->map(fn (MemoSet $set) => [
                'id' => $set->id,
                'name' => $set->name,
                'description' => $set->description,
                'color' => $set->color,
                'cards_count' => $set->cards_count,
                'updated_at' => $set->updated_at->toISOString(),
            ]),
        ]);
    }

    public function create(): Response
    {
        return Inertia::render('tools/memo-sets/create');
    }

    public function store(StoreMemoSetRequest $request): RedirectResponse
    {
        $request->user()->memoSets()->create($request->validated());

        return to_route('memo-sets.index');
    }

    public function show(Request $request, MemoSet $memoSet): Response
    {
        $this->authorize('view', $memoSet);

        return Inertia::render('tools/memo-sets/show', [
            'memoSet' => [
                'id' => $memoSet->id,
                'name' => $memoSet->name,
                'description' => $memoSet->description,
                'color' => $memoSet->color,
            ],
            'cards' => $memoSet->cards()->orderByDesc('updated_at')->get()->map(fn (MemoCard $card) => [
                'id' => $card->id,
                'front' => $card->front,
                'back' => $card->back,
                'correct_count' => $card->correct_count,
                'incorrect_count' => $card->incorrect_count,
            ]),
        ]);
    }

    public function edit(MemoSet $memoSet): Response
    {
        $this->authorize('update', $memoSet);

        return Inertia::render('tools/memo-sets/edit', [
            'memoSet' => [
                'id' => $memoSet->id,
                'name' => $memoSet->name,
                'description' => $memoSet->description,
                'color' => $memoSet->color,
            ],
        ]);
    }

    public function update(UpdateMemoSetRequest $request, MemoSet $memoSet): RedirectResponse
    {
        $this->authorize('update', $memoSet);

        $memoSet->update($request->validated());

        return to_route('memo-sets.show', $memoSet);
    }

    public function destroy(MemoSet $memoSet): RedirectResponse
    {
        $this->authorize('delete', $memoSet);

        $memoSet->delete();

        return to_route('memo-sets.index');
    }

    public function export(MemoSet $memoSet): StreamedResponse
    {
        $this->authorize('view', $memoSet);

        $filename = str()->slug($memoSet->name).'-cards.csv';

        return response()->streamDownload(function () use ($memoSet) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['front', 'back'], ';');

            $memoSet->cards()->orderBy('id')->each(function (MemoCard $card) use ($handle) {
                fputcsv($handle, [$card->front, $card->back], ';');
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }

    public function import(Request $request, MemoSet $memoSet): RedirectResponse
    {
        $this->authorize('update', $memoSet);

        $data = $request->validate([
            'csv_file' => ['required_without:csv_text', 'nullable', 'file', 'mimes:csv,txt', 'max:1024'],
            'csv_text' => ['required_without:csv_file', 'nullable', 'string', 'max:100000'],
        ]);

        $lines = [];

        if ($request->hasFile('csv_file')) {
            $content = file_get_contents($request->file('csv_file')->getRealPath());
            $lines = $this->parseCsvLines($content);
        } elseif (! empty($data['csv_text'])) {
            $lines = $this->parseCsvLines($data['csv_text']);
        }

        $imported = 0;
        foreach ($lines as $line) {
            if (count($line) >= 2 && trim($line[0]) !== '' && trim($line[1]) !== '') {
                $front = trim($line[0]);
                $back = trim($line[1]);

                if (mb_strlen($front) <= 2000 && mb_strlen($back) <= 2000) {
                    $memoSet->cards()->create(['front' => $front, 'back' => $back]);
                    $imported++;
                }
            }
        }

        return to_route('memo-sets.show', $memoSet)->with('message', "$imported cards imported.");
    }

    /**
     * @return array<int, array<int, string>>
     */
    private function parseCsvLines(string $content): array
    {
        $lines = [];
        $rows = preg_split('/\r\n|\r|\n/', $content);

        foreach ($rows as $i => $row) {
            if (trim($row) === '') {
                continue;
            }

            $parsed = str_getcsv($row, ';');

            if ($i === 0 && count($parsed) >= 2 && strtolower(trim($parsed[0])) === 'front' && strtolower(trim($parsed[1])) === 'back') {
                continue;
            }

            $lines[] = $parsed;
        }

        return $lines;
    }

    public function learn(MemoSet $memoSet): Response
    {
        $this->authorize('view', $memoSet);

        $cards = $memoSet->cards()->get()->map(fn (MemoCard $card) => [
            'id' => $card->id,
            'front' => $card->front,
            'back' => $card->back,
            'correct_count' => $card->correct_count,
            'incorrect_count' => $card->incorrect_count,
            'weight' => max(1, ($card->incorrect_count + 1) - ($card->correct_count * 0.5)),
        ]);

        return Inertia::render('tools/memo-sets/learn', [
            'memoSet' => [
                'id' => $memoSet->id,
                'name' => $memoSet->name,
                'color' => $memoSet->color,
            ],
            'cards' => $cards,
        ]);
    }
}
