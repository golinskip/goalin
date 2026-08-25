<?php

namespace Domain\Tools\DailyTodo\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ImportTodoistTasksRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'date' => ['required', 'date_format:Y-m-d'],
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'string', 'max:64'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ids.required' => 'Pick at least one Todoist task to import.',
        ];
    }
}
