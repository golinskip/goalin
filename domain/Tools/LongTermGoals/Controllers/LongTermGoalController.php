<?php

namespace Domain\Tools\LongTermGoals\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Domain\Tools\LongTermGoals\Models\LongTermGoal;
use Domain\Tools\LongTermGoals\Requests\StoreLongTermGoalRequest;
use Domain\Tools\LongTermGoals\Requests\UpdateLongTermGoalRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;

class LongTermGoalController extends Controller
{
    use AuthorizesRequests;

    public function store(StoreLongTermGoalRequest $request): RedirectResponse
    {
        $user = $request->user();
        $validated = $request->validated();

        $type = GoalPeriodType::from($validated['period_type']);

        $period = $user->goalPeriods()->firstOrCreate([
            'type' => $type,
            'year' => $validated['year'],
            'month' => $type === GoalPeriodType::Monthly ? $validated['month'] : null,
        ]);

        $maxOrder = $period->longTermGoals()->max('sort_order') ?? -1;

        $user->longTermGoals()->create([
            'goal_period_id' => $period->id,
            'goal_category_id' => $validated['goal_category_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'sort_order' => $maxOrder + 1,
        ]);

        return back();
    }

    public function update(UpdateLongTermGoalRequest $request, LongTermGoal $longTermGoal): RedirectResponse
    {
        $this->authorize('update', $longTermGoal);

        $longTermGoal->update($request->validated());

        return back();
    }

    public function destroy(LongTermGoal $longTermGoal): RedirectResponse
    {
        $this->authorize('delete', $longTermGoal);

        $longTermGoal->delete();

        return back();
    }
}
