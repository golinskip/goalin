<?php

namespace Domain\Tools\DailyRoutine\Requests;

use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LogRoutineTaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'log_date' => ['required', 'date', 'before_or_equal:today'],
            'status' => ['nullable', Rule::enum(RoutineTaskStatus::class)],
        ];
    }
}
