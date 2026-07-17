<?php

namespace Domain\Tools\Flashcards\Requests;

use Closure;
use Domain\Tools\Flashcards\Models\MemoFolder;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MoveMemoFolderRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('memo_folders', 'id')->where('user_id', $this->user()->id),
                fn (string $attribute, mixed $value, Closure $fail) => $this->failWhenDetachingSubtree($value, $fail),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'parent_id.exists' => 'The selected folder does not exist.',
        ];
    }

    /**
     * A folder cannot be moved into itself or into one of its own descendants,
     * which would cut the subtree loose from the root.
     */
    private function failWhenDetachingSubtree(mixed $value, Closure $fail): void
    {
        if ($value === null) {
            return;
        }

        /** @var MemoFolder $folder */
        $folder = $this->route('memo_folder');

        if ((int) $value === $folder->id) {
            $fail('A folder cannot be moved into itself.');

            return;
        }

        $target = MemoFolder::find($value);

        if ($target !== null && $folder->hasDescendant($target)) {
            $fail('A folder cannot be moved into one of its own subfolders.');
        }
    }
}
