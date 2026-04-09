<?php

namespace Domain\Tools\RssFeeds\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreRssFeedRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'feed_url' => [
                'required',
                'url',
                'max:2048',
                function (string $attribute, mixed $value, \Closure $fail): void {
                    $exists = $this->user()->rssFeeds()
                        ->where('feed_url', $value)
                        ->exists();

                    if ($exists) {
                        $fail('You are already subscribed to this feed.');
                    }
                },
            ],
            'name' => ['nullable', 'string', 'max:255'],
            'color' => ['nullable', 'string', 'regex:/^#[0-9a-fA-F]{6}$/'],
        ];
    }
}
