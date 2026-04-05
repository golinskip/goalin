<?php

namespace Domain\Tools\Games\Games\Volleyball;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VolleyballController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $recent = $request->user()->gameResults()
            ->where('game', 'volleyball')
            ->orderByDesc('played_at')
            ->limit(10)
            ->get()
            ->map(fn ($row): array => [
                'id' => $row->id,
                'result' => (float) $row->result,
                'played_at' => $row->played_at->toISOString(),
            ]);

        $best = $request->user()->gameResults()
            ->where('game', 'volleyball')
            ->max('result');

        return Inertia::render('tools/games/volleyball/index', [
            'recent' => $recent,
            'best' => $best !== null ? (float) $best : null,
        ]);
    }
}
