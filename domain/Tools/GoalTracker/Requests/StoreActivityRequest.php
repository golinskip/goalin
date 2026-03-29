<?php

namespace Domain\Tools\GoalTracker\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreActivityRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'point_cost' => ['required', 'integer', 'min:1', 'max:999999'],
            'color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'needs_timer' => ['boolean'],
            'duration_minutes' => ['nullable', 'required_if:needs_timer,true', 'integer', 'min:1', 'max:1440'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'goal_ids' => ['nullable', 'array'],
            'goal_ids.*' => ['integer', 'exists:goals,id'],
        ];
    }
}
