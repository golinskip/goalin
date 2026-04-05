<?php

namespace Domain\Tools\Games\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\Games\Requests\StoreGameResultRequest;
use Illuminate\Http\JsonResponse;

class GameResultController extends Controller
{
    public function store(StoreGameResultRequest $request): JsonResponse
    {
        $result = $request->user()->gameResults()->create([
            ...$request->validated(),
            'played_at' => now(),
        ]);

        return response()->json([
            'id' => $result->id,
            'game' => $result->game,
            'result' => $result->result,
            'played_at' => $result->played_at->toISOString(),
        ], 201);
    }
}
