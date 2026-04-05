<?php

namespace Domain\Tools\Games\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\Games\Models\GameResult;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class GamesController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $higherIsBetter = ['serve', 'aim_trainer', 'memory'];

        $bestResults = $user->gameResults()
            ->selectRaw('game, MIN(result) as min_result, MAX(result) as max_result, COUNT(*) as plays')
            ->groupBy('game')
            ->get()
            ->keyBy('game')
            ->map(fn (GameResult $row): array => [
                'best_result' => in_array($row->getAttribute('game'), $higherIsBetter, true)
                    ? (float) $row->getAttribute('max_result')
                    : (float) $row->getAttribute('min_result'),
                'plays' => (int) $row->getAttribute('plays'),
            ])
            ->toArray();

        return Inertia::render('tools/games/index', [
            'bestResults' => $bestResults,
        ]);
    }
}
