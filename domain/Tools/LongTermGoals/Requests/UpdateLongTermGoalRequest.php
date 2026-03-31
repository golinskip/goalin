<?php

namespace Domain\Tools\LongTermGoals\Requests;

use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateLongTermGoalRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'goal_category_id' => ['nullable', 'integer', 'exists:goal_categories,id'],
            'status' => ['sometimes', Rule::enum(GoalStatus::class)],
            'review_note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
