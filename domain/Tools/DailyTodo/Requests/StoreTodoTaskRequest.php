<?php

namespace Domain\Tools\DailyTodo\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTodoTaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'parent_id' => [
                'nullable',
                Rule::exists('todo_tasks', 'id')
                    ->where('user_id', $this->user()->id)
                    ->whereNull('parent_id'),
            ],
            'due_date' => ['nullable', 'required_without:parent_id', 'date'],
        ];
    }

    /**
     * A subtask inherits its parent's schedule; only top-level tasks carry a date.
     *
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): array
    {
        /** @var array<string, mixed> $data */
        $data = parent::validated();

        if (! empty($data['parent_id'])) {
            $data['due_date'] = null;
        }

        return $data;
    }
}
