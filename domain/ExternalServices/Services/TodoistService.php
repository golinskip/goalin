<?php

namespace Domain\ExternalServices\Services;

use Carbon\CarbonInterface;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Models\ServiceConnection;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

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
     * The user's active Todoist tasks due on the given day.
     *
     * @return array<int, array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null, labels: array<int, string>, completed: bool}>
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
     * Read a single task, whatever its state. Todoist answers 200 for tasks it
     * has deleted, so those are reported as gone.
     *
     * @return array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null, labels: array<int, string>, completed: bool}|null
     */
    public function findTask(User $user, string $taskId): ?array
    {
        $connection = $user->serviceConnection(ServiceType::Todoist);

        if ($connection === null) {
            return null;
        }

        try {
            $response = Http::withToken($connection->access_token)
                ->timeout(10)
                ->get(self::BASE_URL."/tasks/{$taskId}");

            if (! $response->successful() || $response->json('is_deleted') === true) {
                return null;
            }

            return self::presentTask($response->json());
        } catch (\Throwable $e) {
            self::logFailure('read', $taskId, null, $e->getMessage());

            return null;
        }
    }

    /**
     * Create a task in Todoist, returning its id, or null when it could not be
     * created.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function createTask(User $user, array $attributes): ?string
    {
        $connection = $user->serviceConnection(ServiceType::Todoist);

        if ($connection === null) {
            return null;
        }

        try {
            $response = Http::withToken($connection->access_token)
                ->timeout(10)
                ->post(self::BASE_URL.'/tasks', self::withoutNulls($attributes));

            if (! $response->successful()) {
                self::logFailure('create', '-', $response->status(), $response->body());

                return null;
            }

            $id = $response->json('id');

            return is_scalar($id) ? (string) $id : null;
        } catch (\Throwable $e) {
            self::logFailure('create', '-', null, $e->getMessage());

            return null;
        }
    }

    /**
     * Push changed fields onto an existing Todoist task.
     *
     * @param  array<string, mixed>  $attributes
     */
    public function updateTask(User $user, string $taskId, array $attributes): bool
    {
        $connection = $user->serviceConnection(ServiceType::Todoist);

        if ($connection === null) {
            return false;
        }

        try {
            $response = Http::withToken($connection->access_token)
                ->timeout(10)
                ->post(self::BASE_URL."/tasks/{$taskId}", self::withoutNulls($attributes));

            if ($response->successful()) {
                return true;
            }

            self::logFailure('update', $taskId, $response->status(), $response->body());

            return false;
        } catch (\Throwable $e) {
            self::logFailure('update', $taskId, null, $e->getMessage());

            return false;
        }
    }

    /**
     * Complete the given task in Todoist. Returns false when the user has no
     * connection or Todoist could not be reached, so a local completion is
     * never blocked by the sync.
     */
    public function closeTask(User $user, string $taskId): bool
    {
        return $this->postTaskAction($user, $taskId, 'close');
    }

    /**
     * Re-open a previously completed task in Todoist.
     */
    public function reopenTask(User $user, string $taskId): bool
    {
        return $this->postTaskAction($user, $taskId, 'reopen');
    }

    /**
     * Todoist rejects the empty JSON array Laravel would otherwise send as the
     * body of a bodyless POST, so an empty object is sent explicitly.
     */
    private function postTaskAction(User $user, string $taskId, string $action): bool
    {
        $connection = $user->serviceConnection(ServiceType::Todoist);

        if ($connection === null) {
            return false;
        }

        try {
            $response = Http::withToken($connection->access_token)
                ->timeout(5)
                ->withBody('{}', 'application/json')
                ->post(self::BASE_URL."/tasks/{$taskId}/{$action}");

            if ($response->successful()) {
                return true;
            }

            self::logFailure($action, $taskId, $response->status(), $response->body());

            return false;
        } catch (\Throwable $e) {
            self::logFailure($action, $taskId, null, $e->getMessage());

            return false;
        }
    }

    /**
     * @return array<int, array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null, labels: array<int, string>, completed: bool}>
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
     * @return array{id: string, content: string, description: string|null, url: string, due: string|null, priority: int, project_id: string|null, labels: array<int, string>, completed: bool}
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
            'completed' => (bool) ($task['checked'] ?? false),
        ];
    }

    /**
     * Todoist treats a missing key and a null value differently; only the keys
     * a caller actually set are sent.
     *
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    private static function withoutNulls(array $attributes): array
    {
        return array_filter($attributes, fn (mixed $value): bool => $value !== null);
    }

    private static function logFailure(string $action, string $taskId, ?int $status, string $detail): void
    {
        Log::warning('Todoist task sync failed.', [
            'action' => $action,
            'task_id' => $taskId,
            'status' => $status,
            'detail' => $detail,
        ]);
    }
}
