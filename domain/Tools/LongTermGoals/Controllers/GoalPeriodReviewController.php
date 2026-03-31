<?php

namespace Domain\Tools\LongTermGoals\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Domain\Tools\LongTermGoals\Models\GoalPeriod;
use Domain\Tools\LongTermGoals\Requests\ReviewGoalPeriodRequest;
use Illuminate\Http\RedirectResponse;

class GoalPeriodReviewController extends Controller
{
    public function __invoke(ReviewGoalPeriodRequest $request, GoalPeriod $goalPeriod): RedirectResponse
    {
        $validated = $request->validated();

        $goalPeriod->update([
            'review_comment' => $validated['review_comment'] ?? null,
            'reviewed_at' => now(),
        ]);

        foreach ($validated['goals'] as $goalData) {
            $goal = $goalPeriod->longTermGoals()->where('id', $goalData['id'])->first();

            if ($goal && $goal->user_id === $request->user()->id) {
                $goal->update([
                    'status' => GoalStatus::from($goalData['status']),
                    'review_note' => $goalData['review_note'] ?? null,
                ]);
            }
        }

        return back();
    }
}
