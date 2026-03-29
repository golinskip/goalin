<?php

namespace Domain\Tools\GoalTracker\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreActivityLogRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'activity_id' => ['required', 'integer', 'exists:activities,id'],
            'completed_at' => ['required', 'date', 'before_or_equal:today'],
            'quantity' => ['required', 'integer', 'min:1', 'max:999'],
            'used_timer' => ['boolean'],
            'comment' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
