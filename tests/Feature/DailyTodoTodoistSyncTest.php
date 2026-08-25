<?php

use Domain\ExternalServices\Enums\ServiceType;
use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Http;

function connectTodoistForSync(User $user): void
{
    $user->serviceConnections()->create([
        'service' => ServiceType::Todoist->value,
        'access_token' => 'todoist-token',
    ]);
}

test('a task can be sent to Todoist and is linked to the created task', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks' => Http::response(['id' => '777'], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'Ship the release',
        'description' => 'Tag and deploy',
        'due_date' => '2026-08-25',
        'priority' => 'high',
        'tags' => ['work'],
        'todoist_id' => null,
    ]);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.send', $task))
        ->assertSessionHasNoErrors();

    expect($task->fresh()->todoist_id)->toBe('777');

    Http::assertSent(function ($request): bool {
        $body = $request->data();

        return $request->url() === 'https://api.todoist.com/api/v1/tasks'
            && $body['content'] === 'Ship the release'
            && $body['description'] === 'Tag and deploy'
            && $body['due_date'] === '2026-08-25'
            && $body['priority'] === 4
            && $body['labels'] === ['work'];
    });
});

test('a task already linked to Todoist is not sent twice', function () {
    Http::fake();

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create(['todoist_id' => '901']);

    $this->actingAs($user)->post(route('daily-todo.todoist.send', $task));

    expect($task->fresh()->todoist_id)->toBe('901');

    Http::assertNothingSent();
});

test('sending fails cleanly when Todoist rejects the task', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks' => Http::response(['error' => 'Bad Request'], 400),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create(['todoist_id' => null]);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.send', $task))
        ->assertSessionHasErrors('todoist');

    expect($task->fresh()->todoist_id)->toBeNull();
});

test('a task cannot be sent to Todoist without a connection', function () {
    Http::fake();

    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create(['todoist_id' => null]);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.send', $task))
        ->assertSessionHasErrors('todoist');

    Http::assertNothingSent();
});

test('another users task cannot be sent to Todoist', function () {
    Http::fake();

    $owner = User::factory()->create();
    $other = User::factory()->create();
    connectTodoistForSync($other);

    $task = TodoTask::factory()->for($owner)->create(['todoist_id' => null]);

    $this->actingAs($other)
        ->post(route('daily-todo.todoist.send', $task))
        ->assertForbidden();

    Http::assertNothingSent();
});

test('subtasks cannot be sent to Todoist', function () {
    Http::fake();

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $parent = TodoTask::factory()->for($user)->create();
    $subtask = TodoTask::factory()->subtaskOf($parent)->create(['todoist_id' => null]);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.send', $subtask))
        ->assertForbidden();

    Http::assertNothingSent();
});

test('renaming a linked task pushes the new title to Todoist', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/901' => Http::response(['id' => '901'], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'Old title',
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
    ]);

    $this->actingAs($user)
        ->put(route('todo-tasks.update', $task), [
            'title' => 'New title',
            'due_date' => '2026-08-27',
        ])
        ->assertSessionHasNoErrors();

    Http::assertSent(function ($request): bool {
        $body = $request->data();

        return $request->url() === 'https://api.todoist.com/api/v1/tasks/901'
            && $body['content'] === 'New title'
            && $body['due_date'] === '2026-08-27';
    });
});

test('editing a linked task without touching the title or date sends nothing', function () {
    Http::fake();

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'Same title',
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
    ]);

    $this->actingAs($user)
        ->put(route('todo-tasks.update', $task), [
            'title' => 'Same title',
            'due_date' => '2026-08-25',
            'description' => 'Only the description moved',
        ])
        ->assertSessionHasNoErrors();

    Http::assertNothingSent();
});

test('editing an unlinked task never reaches Todoist', function () {
    Http::fake();

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'Local only',
        'due_date' => '2026-08-25',
        'todoist_id' => null,
    ]);

    $this->actingAs($user)
        ->put(route('todo-tasks.update', $task), [
            'title' => 'Renamed locally',
            'due_date' => '2026-08-26',
        ]);

    Http::assertNothingSent();
});

/**
 * @param  array<string, mixed>  $overrides
 * @return array<string, mixed>
 */
function todoistTask(array $overrides = []): array
{
    return [
        'id' => '901',
        'content' => 'From Todoist',
        'description' => '',
        'due' => ['date' => '2026-08-25'],
        'priority' => 1,
        'labels' => [],
        'checked' => false,
        'is_deleted' => false,
        ...$overrides,
    ];
}

test('the day sync takes the title, details and date from Todoist', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/901' => Http::response(todoistTask([
            'content' => 'Renamed in Todoist',
            'description' => 'Notes added there',
            'due' => ['date' => '2026-08-27'],
            'priority' => 4,
            'labels' => ['work', 'urgent'],
        ]), 200),
        'api.todoist.com/api/v1/tasks/filter*' => Http::response(['results' => []], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'Old local title',
        'description' => null,
        'due_date' => '2026-08-25',
        'priority' => 'low',
        'tags' => [],
        'todoist_id' => '901',
        'estimated_cycles' => 3,
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['updated' => 1, 'imported' => 0, 'gone' => 0]);

    $task->refresh();

    expect($task->title)->toBe('Renamed in Todoist')
        ->and($task->description)->toBe('Notes added there')
        ->and($task->due_date->toDateString())->toBe('2026-08-27')
        ->and($task->priority->value)->toBe('high')
        ->and($task->tags)->toBe(['work', 'urgent'])
        ->and($task->estimated_cycles)->toBe(3);
});

test('a task completed in Todoist is completed in the app', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/901' => Http::response(todoistTask(['checked' => true]), 200),
        'api.todoist.com/api/v1/tasks/filter*' => Http::response(['results' => []], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'From Todoist',
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
        'completed_at' => null,
        'not_done' => true,
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk();

    $task->refresh();

    expect($task->isCompleted())->toBeTrue()
        ->and($task->isNotDone())->toBeFalse();
});

test('a task re-opened in Todoist is pending again in the app', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/901' => Http::response(todoistTask(['checked' => false]), 200),
        'api.todoist.com/api/v1/tasks/filter*' => Http::response(['results' => []], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'From Todoist',
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
        'completed_at' => now(),
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk();

    expect($task->fresh()->isCompleted())->toBeFalse();
});

test('the day sync pulls in Todoist tasks the app does not have yet', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/filter*' => Http::response([
            'results' => [
                todoistTask([
                    'id' => '905',
                    'content' => 'Added in Todoist',
                    'description' => 'With a note',
                    'priority' => 3,
                    'labels' => ['home'],
                ]),
            ],
        ], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['updated' => 0, 'imported' => 1, 'gone' => 0]);

    $task = $user->todoTasks()->where('todoist_id', '905')->first();

    expect($task)->not->toBeNull()
        ->and($task->title)->toBe('Added in Todoist')
        ->and($task->description)->toBe('With a note')
        ->and($task->priority->value)->toBe('medium')
        ->and($task->tags)->toBe(['home'])
        ->and($task->due_date->toDateString())->toBe('2026-08-25')
        ->and($task->links[0]['url'])->toBe('https://app.todoist.com/app/task/905');
});

test('a Todoist task already linked elsewhere is not pulled in twice', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/filter*' => Http::response([
            'results' => [todoistTask(['id' => '906'])],
        ], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    TodoTask::factory()->for($user)->create([
        'due_date' => '2026-08-20',
        'todoist_id' => '906',
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['imported' => 0]);

    expect($user->todoTasks()->where('todoist_id', '906')->count())->toBe(1);
});

test('a task deleted in Todoist is reported but kept in the app', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/901' => Http::response(todoistTask(['is_deleted' => true]), 200),
        'api.todoist.com/api/v1/tasks/filter*' => Http::response(['results' => []], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'Still mine',
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['updated' => 0, 'gone' => 1]);

    expect($task->fresh()->title)->toBe('Still mine');
});

test('the day sync leaves tasks that never came from Todoist alone', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/filter*' => Http::response(['results' => []], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $task = TodoTask::factory()->for($user)->create([
        'title' => 'Local only',
        'due_date' => '2026-08-25',
        'todoist_id' => null,
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['updated' => 0, 'imported' => 0, 'gone' => 0]);

    expect($task->fresh()->title)->toBe('Local only');

    Http::assertSentCount(1);
});

test('the day sync only reads the signed in users tasks', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/filter*' => Http::response(['results' => []], 200),
    ]);

    $owner = User::factory()->create();
    $other = User::factory()->create();
    connectTodoistForSync($other);

    $task = TodoTask::factory()->for($owner)->create([
        'title' => 'Owned elsewhere',
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
    ]);

    $this->actingAs($other)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['updated' => 0, 'imported' => 0, 'gone' => 0]);

    expect($task->fresh()->title)->toBe('Owned elsewhere');
});

test('the day sync needs a Todoist connection', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertForbidden();
});

test('the day sync needs a valid date', function () {
    $user = User::factory()->create();
    connectTodoistForSync($user);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => 'not-a-date'])
        ->assertStatus(422);
});

test('guests cannot reach the Todoist sync endpoints', function () {
    $this->post(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertRedirect(route('login'));
});

test('a task that already matches Todoist is not counted as updated', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/901' => Http::response(todoistTask([
            'content' => 'Same everywhere',
            'description' => 'Same notes',
            'priority' => 3,
            'labels' => ['home'],
        ]), 200),
        'api.todoist.com/api/v1/tasks/filter*' => Http::response(['results' => []], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    TodoTask::factory()->for($user)->create([
        'title' => 'Same everywhere',
        'description' => 'Same notes',
        'due_date' => '2026-08-25',
        'priority' => 'medium',
        'tags' => ['home'],
        'todoist_id' => '901',
        'completed_at' => null,
        'not_done' => false,
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['updated' => 0, 'imported' => 0, 'gone' => 0]);
});
