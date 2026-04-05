<?php

namespace Domain\Tools\Games\Games\Memory;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MemoryController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $recent = $request->user()->gameResults()
            ->where('game', 'memory')
            ->orderByDesc('played_at')
            ->limit(10)
            ->get()
            ->map(fn ($row): array => [
                'id' => $row->id,
                'result' => (float) $row->result,
                'played_at' => $row->played_at->toISOString(),
            ]);

        $best = $request->user()->gameResults()
            ->where('game', 'memory')
            ->max('result');

        return Inertia::render('tools/games/memory/index', [
            'recent' => $recent,
            'best' => $best !== null ? (float) $best : null,
        ]);
    }
}
