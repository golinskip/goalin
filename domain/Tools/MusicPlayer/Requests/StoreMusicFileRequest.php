<?php

namespace Domain\Tools\MusicPlayer\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreMusicFileRequest extends FormRequest
{
    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['required', 'file', 'mimes:mp3,wav,ogg,flac,aac,m4a', 'max:51200'],
            'playlist_id' => ['nullable', 'integer', 'exists:playlists,id'],
        ];
    }
}
