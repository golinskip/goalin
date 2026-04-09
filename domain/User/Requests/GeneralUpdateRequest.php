<?php

namespace Domain\User\Requests;

use Domain\User\Enums\Currency;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class GeneralUpdateRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $backgrounds = collect(glob(public_path('img/backgrounds/*.png')))
            ->map(fn (string $path) => pathinfo($path, PATHINFO_FILENAME))
            ->all();

        return [
            'currency' => ['required', 'string', Rule::enum(Currency::class)],
            'multiplier' => ['required', 'numeric', 'min:0.01', 'max:999999.99'],
            'background' => ['nullable', 'string', Rule::in($backgrounds)],
        ];
    }
}
