<?php

namespace Domain\ExternalServices\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTodoistConnectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, array<int, string>>
     */
    public function rules(): array
    {
        return [
            'api_token' => ['required', 'string', 'min:10', 'max:255'],
        ];
    }
}
