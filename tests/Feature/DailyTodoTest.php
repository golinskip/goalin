<?php

use Domain\Tools\DailyTodo\Models\TodoTask;
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

test('a user cannot modify another user task', function () {
    $user = User::factory()->create();
    $task = TodoTask::factory()->create();
    $this->actingAs($user);

    $this->post(route('todo-tasks.toggle', $task))->assertForbidden();
    $this->delete(route('todo-tasks.destroy', $task))->assertForbidden();
});
