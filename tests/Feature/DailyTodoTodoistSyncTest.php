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

test('the day sync pushes every linked task of that day', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/*' => Http::response(['id' => 'ok'], 200),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    $done = TodoTask::factory()->for($user)->create([
        'title' => 'Finished',
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
        'completed_at' => now(),
    ]);

    $pending = TodoTask::factory()->for($user)->create([
        'title' => 'Still open',
        'due_date' => '2026-08-25',
        'todoist_id' => '902',
        'completed_at' => null,
    ]);

    TodoTask::factory()->for($user)->create([
        'due_date' => '2026-08-25',
        'todoist_id' => null,
    ]);

    TodoTask::factory()->for($user)->create([
        'due_date' => '2026-08-26',
        'todoist_id' => '903',
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['synced' => 2, 'failed' => 0, 'unlinked' => 1]);

    Http::assertSent(fn ($request): bool => $request->url() === 'https://api.todoist.com/api/v1/tasks/901'
        && $request->data()['content'] === 'Finished');
    Http::assertSent(fn ($request): bool => $request->url() === 'https://api.todoist.com/api/v1/tasks/901/close');
    Http::assertSent(fn ($request): bool => $request->url() === 'https://api.todoist.com/api/v1/tasks/902/reopen');
    Http::assertNotSent(fn ($request): bool => str_contains($request->url(), '/tasks/903'));

    expect($done->fresh()->todoist_id)->toBe('901')
        ->and($pending->fresh()->todoist_id)->toBe('902');
});

test('the day sync counts tasks Todoist rejected', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/901' => Http::response(['error' => 'gone'], 400),
    ]);

    $user = User::factory()->create();
    connectTodoistForSync($user);

    TodoTask::factory()->for($user)->create([
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
    ]);

    $this->actingAs($user)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['synced' => 0, 'failed' => 1, 'unlinked' => 0]);
});

test('the day sync only touches the signed in users tasks', function () {
    Http::fake(['api.todoist.com/*' => Http::response(['id' => 'ok'], 200)]);

    $owner = User::factory()->create();
    $other = User::factory()->create();
    connectTodoistForSync($other);

    TodoTask::factory()->for($owner)->create([
        'due_date' => '2026-08-25',
        'todoist_id' => '901',
    ]);

    $this->actingAs($other)
        ->postJson(route('daily-todo.todoist.sync'), ['date' => '2026-08-25'])
        ->assertOk()
        ->assertJson(['synced' => 0, 'unlinked' => 0]);

    Http::assertNothingSent();
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

test('the index marks which tasks are linked with Todoist', function () {
    $user = User::factory()->create();

    TodoTask::factory()->for($user)->create([
        'due_date' => now()->toDateString(),
        'todoist_id' => '901',
    ]);

    $this->actingAs($user)
        ->get(route('daily-todo.index'))
        ->assertInertia(fn ($page) => $page->where('tasks.0.todoist_linked', true));
});
