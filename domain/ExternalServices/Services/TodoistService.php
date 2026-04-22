<?php

namespace Domain\ExternalServices\Services;

use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Models\ServiceConnection;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class TodoistService
{
    private const BASE_URL = 'https://api.todoist.com/rest/v2';

    public function verifyToken(string $token): bool
    {
        $response = Http::withToken($token)
            ->timeout(10)
            ->get(self::BASE_URL.'/projects');

        return $response->successful();
    }

    /**
     * @return array<int, array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null}>
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
            fn () => $this->fetchTasks($connection, $limit),
        );
    }

    /**
     * @return array<int, array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null}>
     */
    private function fetchTasks(ServiceConnection $connection, int $limit): array
    {
        try {
            $response = Http::withToken($connection->access_token)
                ->timeout(10)
                ->get(self::BASE_URL.'/tasks', [
                    'filter' => 'today | overdue | 7 days',
                ]);

            if (! $response->successful()) {
                return [];
            }

            $tasks = collect($response->json())
                ->sortBy(fn (array $task): string => $task['due']['date'] ?? '9999-12-31')
                ->take($limit)
                ->map(fn (array $task) => [
                    'id' => (string) $task['id'],
                    'content' => $task['content'] ?? '',
                    'description' => $task['description'] ?? null,
                    'url' => $task['url'] ?? 'https://app.todoist.com/app/today',
                    'due' => $task['due']['date'] ?? null,
                    'priority' => (int) ($task['priority'] ?? 1),
                    'project_id' => isset($task['project_id']) ? (string) $task['project_id'] : null,
                ])
                ->values()
                ->all();

            return $tasks;
        } catch (\Throwable) {
            return [];
        }
    }
}
