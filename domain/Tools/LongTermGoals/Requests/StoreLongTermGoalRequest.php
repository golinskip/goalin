<?php

namespace Domain\Tools\LongTermGoals\Requests;

use Domain\Tools\LongTermGoals\Enums\GoalPeriodType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLongTermGoalRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'period_type' => ['required', Rule::enum(GoalPeriodType::class)],
            'year' => ['required', 'integer', 'min:2000', 'max:2100'],
            'month' => ['nullable', 'integer', 'min:1', 'max:12'],
            'goal_category_id' => ['nullable', 'integer', 'exists:goal_categories,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
