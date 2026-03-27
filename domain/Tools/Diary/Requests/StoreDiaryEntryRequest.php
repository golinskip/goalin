<?php

namespace Domain\Tools\Diary\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDiaryEntryRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'entry_date' => [
                'required',
                'date',
                'before_or_equal:today',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $exists = $this->user()->diaryEntries()
                        ->whereDate('entry_date', $value)
                        ->exists();

                    if ($exists) {
                        $fail('You already have a diary entry for this date.');
                    }
                },
            ],
            'content' => ['required', 'string', 'max:10000'],
        ];
    }
}
