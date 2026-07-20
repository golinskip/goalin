<?php

namespace Domain\Tools\GoalTracker\Requests;

use Domain\Tools\GoalTracker\Concerns\ActivityValidationRules;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateActivityRequest extends FormRequest
{
    use ActivityValidationRules;

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return $this->activityRules();
    }
}
