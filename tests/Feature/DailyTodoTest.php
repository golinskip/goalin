<?php

use Domain\Tools\DailyTodo\Models\TodoTask;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\User\Models\User;

test('guests are redirected to login', function () {
    $this->get(route('daily-todo.index'))->assertRedirect(route('login'));
});

test('authenticated users can visit the daily todo index', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('daily-todo.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/daily-todo/index')
        ->has('tasks')
        ->has('calendar')
        ->where('selectedDate', now()->toDateString())
        ->where('today', now()->toDateString())
        ->where('month', now()->format('Y-m'))
    );
});

test('only top-level tasks for the selected day are returned with their subtasks', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $todayTask = TodoTask::factory()->for($user)->create([
        'title' => 'Plan the week',
        'due_date' => now()->toDateString(),
    ]);
    $subtask = TodoTask::factory()->subtaskOf($todayTask)->create(['title' => 'List priorities']);

    TodoTask::factory()->for($user)->create([
        'title' => 'Tomorrow task',
        'due_date' => now()->addDay()->toDateString(),
    ]);

    $response = $this->get(route('daily-todo.index'));

    $response->assertInertia(fn ($page) => $page
        ->has('tasks', 1)
        ->where('tasks.0.title', 'Plan the week')
        ->has('tasks.0.subtasks', 1)
        ->where('tasks.0.subtasks.0.title', 'List priorities')
        ->where('tasks.0.subtasks.0.id', $subtask->id)
    );
});

test('a user can create a task for a given day', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post(route('todo-tasks.store'), [
        'title' => 'Buy groceries',
        'due_date' => '2026-08-01',
    ])->assertRedirect();

    $task = TodoTask::query()->where('title', 'Buy groceries')->sole();

    expect($task->user_id)->toBe($user->id)
        ->and($task->parent_id)->toBeNull()
        ->and($task->due_date->toDateString())->toBe('2026-08-01');
});

test('a top-level task requires a due date', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $this->post(route('todo-tasks.store'), ['title' => 'No date'])
        ->assertSessionHasErrors('due_date');
});

test('a user can add a subtask to a parent and it inherits no date', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $parent = TodoTask::factory()->for($user)->create();

    $this->post(route('todo-tasks.store'), [
        'title' => 'Sub step',
        'parent_id' => $parent->id,
        'due_date' => '2026-08-01',
    ])->assertRedirect();

    $this->assertDatabaseHas('todo_tasks', [
        'title' => 'Sub step',
        'parent_id' => $parent->id,
        'due_date' => null,
    ]);
});

test('a subtask can only attach to the user own top-level task', function () {
    $user = User::factory()->create();
    $otherTask = TodoTask::factory()->create();
    $this->actingAs($user);

    $this->post(route('todo-tasks.store'), [
        'title' => 'Sneaky',
        'parent_id' => $otherTask->id,
    ])->assertSessionHasErrors('parent_id');
});

test('toggling a task flips its completion', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->post(route('todo-tasks.toggle', $task))->assertRedirect();
    expect($task->fresh()->completed_at)->not->toBeNull();

    $this->post(route('todo-tasks.toggle', $task))->assertRedirect();
    expect($task->fresh()->completed_at)->toBeNull();
});

test('a user can reschedule a task to another day', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create(['due_date' => now()->toDateString()]);
    $this->actingAs($user);

    $this->put(route('todo-tasks.update', $task), [
        'title' => 'Moved task',
        'due_date' => '2026-09-15',
    ])->assertRedirect();

    expect($task->fresh())
        ->title->toBe('Moved task')
        ->due_date->toDateString()->toBe('2026-09-15');
});

test('deleting a parent removes its subtasks', function () {
    $user = User::factory()->create();
    $parent = TodoTask::factory()->for($user)->create();
    $subtask = TodoTask::factory()->subtaskOf($parent)->create();
    $this->actingAs($user);

    $this->delete(route('todo-tasks.destroy', $parent))->assertRedirect();

    $this->assertDatabaseMissing('todo_tasks', ['id' => $parent->id]);
    $this->assertDatabaseMissing('todo_tasks', ['id' => $subtask->id]);
});

test('a user can save rich details on a task', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create(['due_date' => now()->toDateString()]);
    $this->actingAs($user);

    $this->put(route('todo-tasks.update', $task), [
        'title' => 'Detailed task',
        'due_date' => now()->toDateString(),
        'description' => 'Do the thing carefully',
        'estimated_cycles' => 4,
        'priority' => 'high',
        'tags' => ['work', 'urgent', 'work'],
        'links' => [
            ['label' => 'Docs', 'url' => 'https://example.com/docs'],
            ['label' => '', 'url' => 'https://example.com/ref'],
        ],
    ])->assertRedirect()->assertSessionHasNoErrors();

    $task->refresh();

    expect($task->description)->toBe('Do the thing carefully')
        ->and($task->estimated_cycles)->toBe(4)
        ->and($task->priority->value)->toBe('high')
        ->and($task->tags)->toBe(['work', 'urgent'])
        ->and($task->links)->toBe([
            ['label' => 'Docs', 'url' => 'https://example.com/docs'],
            ['label' => null, 'url' => 'https://example.com/ref'],
        ]);
});

test('rich details are exposed to the page for tasks and subtasks', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $task = TodoTask::factory()->for($user)->create([
        'due_date' => now()->toDateString(),
        'priority' => 'medium',
        'tags' => ['home'],
        'estimated_cycles' => 2,
    ]);
    TodoTask::factory()->subtaskOf($task)->create([
        'description' => 'Sub detail',
        'priority' => 'low',
    ]);

    $this->get(route('daily-todo.index'))->assertInertia(fn ($page) => $page
        ->where('tasks.0.priority', 'medium')
        ->where('tasks.0.tags', ['home'])
        ->where('tasks.0.estimated_cycles', 2)
        ->where('tasks.0.subtasks.0.priority', 'low')
        ->where('tasks.0.subtasks.0.description', 'Sub detail')
    );
});

test('an invalid link url is rejected', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create(['due_date' => now()->toDateString()]);
    $this->actingAs($user);

    $this->put(route('todo-tasks.update', $task), [
        'title' => 'Bad link',
        'links' => [['label' => 'Nope', 'url' => 'not-a-url']],
    ])->assertSessionHasErrors('links.0.url');
});

test('a subtask can also carry rich details', function () {
    $user = User::factory()->create();
    $parent = TodoTask::factory()->for($user)->create();
    $subtask = TodoTask::factory()->subtaskOf($parent)->create();
    $this->actingAs($user);

    $this->put(route('todo-tasks.update', $subtask), [
        'title' => 'Sub with details',
        'priority' => 'low',
        'estimated_cycles' => 1,
    ])->assertRedirect()->assertSessionHasNoErrors();

    $subtask->refresh();

    expect($subtask->priority->value)->toBe('low')
        ->and($subtask->estimated_cycles)->toBe(1)
        ->and($subtask->parent_id)->toBe($parent->id)
        ->and($subtask->due_date)->toBeNull();
});

test('the goal tracker timer page exposes today todos with their subtasks', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $activity = Activity::factory()->for($user)->create([
        'needs_timer' => true,
        'duration_minutes' => 25,
    ]);

    $todayTask = TodoTask::factory()->for($user)->create([
        'title' => 'Ship the feature',
        'due_date' => now()->toDateString(),
    ]);
    TodoTask::factory()->subtaskOf($todayTask)->create(['title' => 'Write tests']);

    TodoTask::factory()->for($user)->create([
        'title' => 'Tomorrow only',
        'due_date' => now()->addDay()->toDateString(),
    ]);

    $this->get(route('activities.timer', $activity))->assertOk()->assertInertia(fn ($page) => $page
        ->component('tools/goal-tracker/activities/timer')
        ->has('todayTodos', 1)
        ->where('todayTodos.0.title', 'Ship the feature')
        ->where('todayTodos.0.subtasks.0.title', 'Write tests')
    );
});

test('a user can mark a main task as not done and keep it on the day', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create(['due_date' => '2026-07-20']);
    $this->actingAs($user);

    $this->post(route('todo-tasks.not-done', $task))->assertRedirect();

    expect($task->fresh())
        ->not_done->toBeTrue()
        ->completed_at->toBeNull()
        ->due_date->toDateString()->toBe('2026-07-20');
});

test('marking a not-done task again clears the flag', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create(['not_done' => true]);
    $this->actingAs($user);

    $this->post(route('todo-tasks.not-done', $task))->assertRedirect();

    expect($task->fresh()->not_done)->toBeFalse();
});

test('marking not done with a move date reschedules the task and resets it', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create([
        'due_date' => '2026-07-20',
        'not_done' => true,
    ]);
    $this->actingAs($user);

    $this->post(route('todo-tasks.not-done', $task), ['move_to' => '2026-07-25'])->assertRedirect();

    expect($task->fresh())
        ->due_date->toDateString()->toBe('2026-07-25')
        ->not_done->toBeFalse()
        ->completed_at->toBeNull();
});

test('completing a task clears its not-done flag', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->for($user)->create(['not_done' => true]);
    $this->actingAs($user);

    $this->post(route('todo-tasks.toggle', $task))->assertRedirect();

    expect($task->fresh())
        ->completed_at->not->toBeNull()
        ->not_done->toBeFalse();
});

test('a subtask cannot be marked not done', function () {
    $user = User::factory()->create();
    $parent = TodoTask::factory()->for($user)->create();
    $subtask = TodoTask::factory()->subtaskOf($parent)->create();
    $this->actingAs($user);

    $this->post(route('todo-tasks.not-done', $subtask))->assertForbidden();
});

test('the not-done flag is exposed to the page', function () {
    $user = User::factory()->create();
    TodoTask::factory()->for($user)->create([
        'due_date' => now()->toDateString(),
        'not_done' => true,
    ]);
    $this->actingAs($user);

    $this->get(route('daily-todo.index'))->assertInertia(fn ($page) => $page
        ->where('tasks.0.not_done', true)
    );
});

test('a user cannot mark another user task as not done', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->create();
    $this->actingAs($user);

    $this->post(route('todo-tasks.not-done', $task))->assertForbidden();
});

test('a user cannot modify another user task', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->create();
    $this->actingAs($user);

    $this->post(route('todo-tasks.toggle', $task))->assertForbidden();
    $this->delete(route('todo-tasks.destroy', $task))->assertForbidden();
});
