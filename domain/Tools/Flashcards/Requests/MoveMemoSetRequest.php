<?php

namespace Domain\Tools\Flashcards\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveMemoSetRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'memo_folder_id' => [
                'nullable',
                'integer',
                Rule::exists('memo_folders', 'id')->where('user_id', $this->user()->id),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'memo_folder_id.exists' => 'The selected folder does not exist.',
        ];
    }
}
