<?php

namespace Domain\Tools\Diary\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDiaryEntryRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'content' => ['required', 'string', 'max:10000'],
            'fields' => ['nullable', 'array'],
            'fields.*.label' => ['required', 'string', 'max:100'],
            'fields.*.value' => ['required', 'string', 'max:500'],
        ];
    }
}
