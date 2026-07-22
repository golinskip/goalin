<?php

namespace Domain\Tools\TaskMindmap\Requests;

use Domain\Tools\TaskMindmap\Enums\TaskPriority;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateMindmapTaskRequest extends FormRequest
{
    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:5000'],
            'deadline' => ['nullable', 'date'],
            'color' => ['nullable', 'string', 'max:32'],
            'icon' => ['nullable', 'string', 'max:48'],
            'priority' => ['nullable', Rule::enum(TaskPriority::class)],
            'links' => ['nullable', 'array', 'max:20'],
            'links.*.url' => ['required', 'string', 'url', 'max:2048'],
            'links.*.label' => ['nullable', 'string', 'max:120'],
            'tags' => ['nullable', 'array', 'max:20'],
            'tags.*' => ['string', 'max:40'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function validated($key = null, $default = null): array
    {
        /** @var array<string, mixed> $data */
        $data = parent::validated();

        $data['links'] = $this->normalizeLinks($data['links'] ?? []);
        $data['tags'] = $this->normalizeTags($data['tags'] ?? []);

        return $data;
    }

    /**
     * @param  array<int, array<string, mixed>>  $links
     * @return array<int, array{label: string|null, url: string}>|null
     */
    private function normalizeLinks(array $links): ?array
    {
        $normalized = array_values(array_map(fn (array $link): array => [
            'label' => isset($link['label']) && trim((string) $link['label']) !== '' ? trim((string) $link['label']) : null,
            'url' => trim((string) $link['url']),
        ], $links));

        return $normalized === [] ? null : $normalized;
    }

    /**
     * @param  array<int, string>  $tags
     * @return array<int, string>|null
     */
    private function normalizeTags(array $tags): ?array
    {
        $normalized = array_values(array_unique(array_filter(array_map(
            fn (string $tag): string => trim($tag),
            $tags,
        ), fn (string $tag): bool => $tag !== '')));

        return $normalized === [] ? null : $normalized;
    }
}
