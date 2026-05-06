<?php

namespace Domain\Tools\DailyRoutine\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreRoutineTaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:120'],
            'color' => ['nullable', 'string', 'max:32'],
            'weekdays' => ['required', 'array', 'min:1'],
            'weekdays.*' => ['integer', 'between:1,7'],
            'starts_on' => ['nullable', 'date'],
            'ends_on' => ['nullable', 'date', 'after_or_equal:starts_on'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): array
    {
        /** @var array<string, mixed> $data */
        $data = parent::validated();

        $data['starts_on'] = $data['starts_on'] ?? now()->toDateString();
        $data['ends_on'] = $data['ends_on'] ?? now()->endOfYear()->toDateString();

        $weekdays = array_values(array_unique(array_map('intval', $data['weekdays'])));
        sort($weekdays);
        $data['weekdays'] = $weekdays;

        return $data;
    }
}
