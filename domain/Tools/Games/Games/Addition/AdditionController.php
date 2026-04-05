<?php

namespace Domain\Tools\Games\Games\Addition;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdditionController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $recent = $request->user()->gameResults()
            ->where('game', 'addition')
            ->orderByDesc('played_at')
            ->limit(10)
            ->get()
            ->map(fn ($row): array => [
                'id' => $row->id,
                'result' => (float) $row->result,
                'played_at' => $row->played_at->toISOString(),
            ]);

        $best = $request->user()->gameResults()
            ->where('game', 'addition')
            ->min('result');

        return Inertia::render('tools/games/addition/index', [
            'recent' => $recent,
            'best' => $best !== null ? (float) $best : null,
        ]);
    }
}
