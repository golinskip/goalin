<?php

namespace Domain\Tools\RssFeeds\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateRssFeedRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }
}
