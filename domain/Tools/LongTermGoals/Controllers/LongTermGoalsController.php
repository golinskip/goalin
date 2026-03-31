<?php

namespace Domain\Tools\LongTermGoals\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Domain\Tools\LongTermGoals\Models\GoalPeriod;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class LongTermGoalsController extends Controller
{
    public function __invoke(Request $request): Response
    {
        $user = $request->user();

        $year = (int) $request->query('year', now()->year);
        $month = $request->query('month') ? (int) $request->query('month') : now()->month;

        $yearlyPeriod = $user->goalPeriods()
            ->where('type', GoalPeriodType::Yearly)
            ->where('year', $year)
            ->first();

        $monthlyPeriod = $user->goalPeriods()
            ->where('type', GoalPeriodType::Monthly)
            ->where('year', $year)
            ->where('month', $month)
            ->first();

        $categories = $user->goalCategories()->get()->map(fn ($cat) => [
            'id' => $cat->id,
            'name' => $cat->name,
            'color' => $cat->color,
            'sort_order' => $cat->sort_order,
        ]);

        return Inertia::render('tools/long-term-goals/index', [
            'year' => $year,
            'month' => $month,
            'categories' => $categories,
            'yearlyPeriod' => $yearlyPeriod ? $this->mapPeriod($yearlyPeriod) : null,
            'monthlyPeriod' => $monthlyPeriod ? $this->mapPeriod($monthlyPeriod) : null,
            'statuses' => collect(GoalStatus::cases())->map(fn ($s) => [
                'value' => $s->value,
                'label' => $s->label(),
            ]),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function mapPeriod(GoalPeriod $period): array
    {
        $period->load('longTermGoals.goalCategory');

        return [
            'id' => $period->id,
            'type' => $period->type->value,
            'year' => $period->year,
            'month' => $period->month,
            'review_comment' => $period->review_comment,
            'reviewed_at' => $period->reviewed_at?->toISOString(),
            'goals' => $period->longTermGoals->map(fn ($goal) => [
                'id' => $goal->id,
                'title' => $goal->title,
                'description' => $goal->description,
                'status' => $goal->status->value,
                'review_note' => $goal->review_note,
                'sort_order' => $goal->sort_order,
                'goal_category_id' => $goal->goal_category_id,
                'category' => $goal->goalCategory ? [
                    'id' => $goal->goalCategory->id,
                    'name' => $goal->goalCategory->name,
                    'color' => $goal->goalCategory->color,
                ] : null,
            ]),
        ];
    }
}
