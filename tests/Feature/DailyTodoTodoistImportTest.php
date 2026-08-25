<?php

use Domain\ExternalServices\Enums\ServiceType;
use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Http;

/**
 * @param  array<int, array<string, mixed>>  $tasks
 */
function fakeTodoistTasks(array $tasks): void
{
    Http::fake([
        'api.todoist.com/api/v1/tasks/filter*' => Http::response([
            'results' => $tasks,
            'next_cursor' => null,
        ], 200),
    ]);
}

function connectTodoist(User $user): void
{
    $user->serviceConnections()->create([
        'service' => ServiceType::Todoist->value,
        'access_token' => 'todoist-token',
    ]);
}

test('the index reports whether Todoist is connected', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->get(route('daily-todo.index'))
        ->assertInertia(fn ($page) => $page->where('todoistConnected', false));

    connectTodoist($user);

    $this->get(route('daily-todo.index'))
        ->assertInertia(fn ($page) => $page->where('todoistConnected', true));
});

test('guests cannot preview Todoist tasks', function () {
    $this->get(route('daily-todo.todoist.preview', ['date' => '2026-08-25']))
        ->assertRedirect(route('login'));
});

test('previewing without a Todoist connection is forbidden', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->getJson(route('daily-todo.todoist.preview', ['date' => '2026-08-25']))
        ->assertForbidden();
});

test('preview lists the Todoist tasks due on the requested day', function () {
    fakeTodoistTasks([
        [
            'id' => '901',
            'content' => 'Write the report',
            'description' => 'Q3 numbers',
            'due' => ['date' => '2026-08-25T09:00:00'],
            'priority' => 4,
            'labels' => ['work'],
        ],
        [
            'id' => '902',
            'content' => 'Water the plants',
            'description' => '',
            'due' => ['date' => '2026-08-25'],
            'priority' => 1,
            'labels' => [],
        ],
    ]);

    $user = User::factory()->create();
    connectTodoist($user);

    TodoTask::factory()->for($user)->create([
        'todoist_id' => '902',
        'due_date' => '2026-08-25',
    ]);

    $response = $this->actingAs($user)
        ->getJson(route('daily-todo.todoist.preview', ['date' => '2026-08-25']))
        ->assertOk();

    $response->assertJsonPath('tasks.0.id', '901')
        ->assertJsonPath('tasks.0.content', 'Write the report')
        ->assertJsonPath('tasks.0.labels.0', 'work')
        ->assertJsonPath('tasks.0.already_imported', false)
        ->assertJsonPath('tasks.1.id', '902')
        ->assertJsonPath('tasks.1.already_imported', true);

    Http::assertSent(fn ($request): bool => str_contains(urldecode($request->url()), 'query=due: 2026-08-25'));
});

test('preview requires a valid date', function () {
    $user = User::factory()->create();
    connectTodoist($user);

    $this->actingAs($user)
        ->getJson(route('daily-todo.todoist.preview', ['date' => '25-08-2026']))
        ->assertStatus(422);
});

test('only the picked Todoist tasks are imported', function () {
    fakeTodoistTasks([
        [
            'id' => '901',
            'content' => 'Write the report',
            'description' => 'Q3 numbers',
            'due' => ['date' => '2026-08-25'],
            'priority' => 4,
            'labels' => ['work', 'urgent'],
        ],
        [
            'id' => '902',
            'content' => 'Water the plants',
            'description' => '',
            'due' => ['date' => '2026-08-25'],
            'priority' => 1,
            'labels' => [],
        ],
    ]);

    $user = User::factory()->create();
    connectTodoist($user);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.import'), [
            'date' => '2026-08-25',
            'ids' => ['901'],
        ])
        ->assertSessionHasNoErrors();

    expect($user->todoTasks()->count())->toBe(1);

    $task = $user->todoTasks()->first();

    expect($task->title)->toBe('Write the report')
        ->and($task->todoist_id)->toBe('901')
        ->and($task->description)->toBe('Q3 numbers')
        ->and($task->tags)->toBe(['work', 'urgent'])
        ->and($task->priority->value)->toBe('high')
        ->and($task->due_date->toDateString())->toBe('2026-08-25')
        ->and($task->parent_id)->toBeNull()
        ->and($task->links[0]['url'])->toBe('https://app.todoist.com/app/task/901');
});

test('todoist priorities map onto todo priorities', function (int $todoistPriority, ?string $expected) {
    fakeTodoistTasks([
        [
            'id' => '901',
            'content' => 'Some task',
            'due' => ['date' => '2026-08-25'],
            'priority' => $todoistPriority,
            'labels' => [],
        ],
    ]);

    $user = User::factory()->create();
    connectTodoist($user);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.import'), ['date' => '2026-08-25', 'ids' => ['901']]);

    expect($user->todoTasks()->first()->priority?->value)->toBe($expected);
})->with([
    [4, 'high'],
    [3, 'medium'],
    [2, 'low'],
    [1, null],
]);

test('tasks that were already imported are not duplicated', function () {
    fakeTodoistTasks([
        [
            'id' => '901',
            'content' => 'Write the report',
            'due' => ['date' => '2026-08-25'],
            'priority' => 1,
            'labels' => [],
        ],
    ]);

    $user = User::factory()->create();
    connectTodoist($user);

    TodoTask::factory()->for($user)->create([
        'todoist_id' => '901',
        'due_date' => '2026-08-25',
    ]);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.import'), ['date' => '2026-08-25', 'ids' => ['901']]);

    expect($user->todoTasks()->where('todoist_id', '901')->count())->toBe(1);
});

test('ids that Todoist does not report for the day are ignored', function () {
    fakeTodoistTasks([
        [
            'id' => '901',
            'content' => 'Write the report',
            'due' => ['date' => '2026-08-25'],
            'priority' => 1,
            'labels' => [],
        ],
    ]);

    $user = User::factory()->create();
    connectTodoist($user);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.import'), [
            'date' => '2026-08-25',
            'ids' => ['901', '999'],
        ]);

    expect($user->todoTasks()->count())->toBe(1)
        ->and($user->todoTasks()->first()->todoist_id)->toBe('901');
});

test('importing requires at least one task', function () {
    $user = User::factory()->create();
    connectTodoist($user);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.import'), ['date' => '2026-08-25', 'ids' => []])
        ->assertSessionHasErrors('ids');
});

test('importing without a Todoist connection fails', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.import'), ['date' => '2026-08-25', 'ids' => ['901']])
        ->assertSessionHasErrors('ids');

    expect($user->todoTasks()->count())->toBe(0);
});

test('a failing Todoist response imports nothing', function () {
    Http::fake([
        'api.todoist.com/api/v1/tasks/filter*' => Http::response(['error' => 'unauthorized'], 401),
    ]);

    $user = User::factory()->create();
    connectTodoist($user);

    $this->actingAs($user)
        ->post(route('daily-todo.todoist.import'), ['date' => '2026-08-25', 'ids' => ['901']])
        ->assertSessionHasNoErrors();

    expect($user->todoTasks()->count())->toBe(0);
});
