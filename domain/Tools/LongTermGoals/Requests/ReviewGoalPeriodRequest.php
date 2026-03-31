<?php

namespace Domain\Tools\LongTermGoals\Requests;

use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReviewGoalPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        $goalPeriod = $this->route('goal_period');

        return $goalPeriod && $this->user()->id === $goalPeriod->user_id;
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'review_comment' => ['nullable', 'string', 'max:5000'],
            'goals' => ['required', 'array'],
            'goals.*.id' => ['required', 'integer', 'exists:long_term_goals,id'],
            'goals.*.status' => ['required', Rule::enum(GoalStatus::class)],
            'goals.*.review_note' => ['nullable', 'string', 'max:2000'],
        ];
    }
}
