<?php

namespace Domain\ExternalServices\Services;

use Carbon\CarbonInterface;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Models\ServiceConnection;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class TodoistService
{
    private const BASE_URL = 'https://api.todoist.com/api/v1';

    public function verifyToken(string $token): bool
    {
        $response = Http::withToken($token)
            ->timeout(10)
            ->get(self::BASE_URL.'/projects', ['limit' => 1]);

        return $response->successful();
    }

    /**
     * @return array<int, array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null, labels: array<int, string>}>
     */
    public function upcomingTasks(User $user, int $limit = 10): array
    {
        $connection = $user->serviceConnection(ServiceType::Todoist);

        if ($connection === null) {
            return [];
        }

        return Cache::remember(
            "todoist:tasks:user:{$user->id}",
            now()->addMinutes(5),
            fn () => collect($this->fetchFiltered($connection, 'today | overdue | 7 days'))
                ->sortBy(fn (array $task): string => $task['due'] ?? '9999-12-31')
                ->take($limit)
                ->values()
                ->all(),
        );
    }

    /**
     * The user's active Todoist tasks due on the given day.
     *
     * @return array<int, array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null, labels: array<int, string>}>
     */
    public function tasksDueOn(User $user, CarbonInterface $date): array
    {
        $connection = $user->serviceConnection(ServiceType::Todoist);

        if ($connection === null) {
            return [];
        }

        return $this->fetchFiltered($connection, 'due: '.$date->format('Y-m-d'));
    }

    /**
     * @return array<int, array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null, labels: array<int, string>}>
     */
    private function fetchFiltered(ServiceConnection $connection, string $query): array
    {
        try {
            $response = Http::withToken($connection->access_token)
                ->timeout(10)
                ->get(self::BASE_URL.'/tasks/filter', [
                    'query' => $query,
                    'limit' => 200,
                ]);

            if (! $response->successful()) {
                return [];
            }

            return collect($response->json('results') ?? [])
                ->map(self::presentTask(...))
                ->values()
                ->all();
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * Todoist reports a plain date for all-day tasks and a full ISO datetime
     * for timed ones; both are normalised to Y-m-d.
     *
     * @param  array<string, mixed>  $task
     */
    private static function dueDate(array $task): ?string
    {
        $date = $task['due']['date'] ?? null;

        return is_string($date) && $date !== '' ? substr($date, 0, 10) : null;
    }

    /**
     * @param  array<string, mixed>  $task
     * @return array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null, labels: array<int, string>}
     */
    private static function presentTask(array $task): array
    {
        $id = (string) ($task['id'] ?? '');

        return [
            'id' => $id,
            'content' => (string) ($task['content'] ?? ''),
            'description' => $task['description'] ?? null,
            'url' => $task['url'] ?? "https://app.todoist.com/app/task/{$id}",
            'due' => self::dueDate($task),
            'priority' => (int) ($task['priority'] ?? 1),
            'project_id' => isset($task['project_id']) ? (string) $task['project_id'] : null,
            'labels' => array_values(array_filter(
                (array) ($task['labels'] ?? []),
                fn (mixed $label): bool => is_string($label) && $label !== '',
            )),
        ];
    }
}
