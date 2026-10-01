<?php

namespace Domain\Tools\StickyNotes\Requests;

use Domain\Tools\StickyNotes\Enums\StickyNoteColor;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStickyNoteRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'content' => ['sometimes', 'required', 'string', 'max:2000'],
            'color' => ['sometimes', 'required', Rule::enum(StickyNoteColor::class)],
            'is_important' => ['sometimes', 'required', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'content.required' => 'A sticky note cannot be empty.',
            'content.max' => 'A sticky note can hold at most 2000 characters.',
        ];
    }
}
