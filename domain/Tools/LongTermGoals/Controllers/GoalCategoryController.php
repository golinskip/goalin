<?php

namespace Domain\Tools\LongTermGoals\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\LongTermGoals\Models\GoalCategory;
use Domain\Tools\LongTermGoals\Requests\StoreGoalCategoryRequest;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class GoalCategoryController extends Controller
{
    use AuthorizesRequests;

    public function store(StoreGoalCategoryRequest $request): RedirectResponse
    {
        $maxOrder = $request->user()->goalCategories()->max('sort_order') ?? -1;

        $request->user()->goalCategories()->create([
            ...$request->validated(),
            'sort_order' => $maxOrder + 1,
        ]);

        return back();
    }

    public function update(Request $request, GoalCategory $goalCategory): RedirectResponse
    {
        $this->authorize('update', $goalCategory);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
        ]);

        $goalCategory->update($validated);

        return back();
    }

    public function destroy(GoalCategory $goalCategory): RedirectResponse
    {
        $this->authorize('delete', $goalCategory);

        $goalCategory->delete();

        return back();
    }
}
