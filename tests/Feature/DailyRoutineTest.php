<?php

use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\DailyRoutine\Models\RoutineTaskLog;
use Domain\User\Models\User;

test('guests are redirected to login', function () {
    $this->get(route('daily-routine.index'))->assertRedirect(route('login'));
});

test('authenticated users can visit the daily routine index', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('daily-routine.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/daily-routine/index')
        ->has('tasks')
        ->has('tasksForSelectedDay')
        ->has('calendar')
        ->where('selectedDate', now()->toDateString())
        ->where('today', now()->toDateString())
    );
});

test('only tasks scheduled for the selected weekday are returned', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $monday = now()->startOfWeek(Carbon\Carbon::MONDAY);

    $matching = RoutineTask::factory()->for($user)->create([
        'name' => 'Monday only',
        'weekdays' => [1],
        'starts_on' => $monday->copy()->subWeek()->toDateString(),
        'ends_on' => $monday->copy()->addWeek()->toDateString(),
    ]);

    RoutineTask::factory()->for($user)->create([
        'name' => 'Friday only',
        'weekdays' => [5],
        'starts_on' => $monday->copy()->subWeek()->toDateString(),
        'ends_on' => $monday->copy()->addWeek()->toDateString(),
    ]);

    $response = $this->get(route('daily-routine.index', ['date' => $monday->toDateString()]));

    $response->assertInertia(fn ($page) => $page
        ->where('tasksForSelectedDay.0.id', $matching->id)
        ->count('tasksForSelectedDay', 1)
    );
});

test('users can create a routine task with default date range', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->post(route('routine-tasks.store'), [
        'name' => 'Drink water',
        'weekdays' => [1, 2, 3, 4, 5, 6, 7],
        'color' => 'sky',
    ]);

    $response->assertRedirect();
    $task = RoutineTask::query()->where('user_id', $user->id)->firstOrFail();

    expect($task->name)->toBe('Drink water');
    expect($task->weekdays)->toBe([1, 2, 3, 4, 5, 6, 7]);
    expect($task->starts_on->toDateString())->toBe(now()->toDateString());
    expect($task->ends_on->toDateString())->toBe(now()->endOfYear()->toDateString());
});

test('routine task name is required', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->from(route('daily-routine.index'))->post(route('routine-tasks.store'), [
        'weekdays' => [1],
    ]);

    $response->assertSessionHasErrors('name');
});

test('users can update their own routine task', function () {
    $user = User::factory()->create();
    $task = RoutineTask::factory()->for($user)->create(['name' => 'Old']);
    $this->actingAs($user);

    $response = $this->put(route('routine-tasks.update', $task), [
        'name' => 'Renamed',
        'weekdays' => [2, 4],
        'color' => 'rose',
        'starts_on' => now()->toDateString(),
        'ends_on' => now()->addMonths(3)->toDateString(),
    ]);

    $response->assertRedirect();
    expect($task->fresh()->name)->toBe('Renamed');
    expect($task->fresh()->weekdays)->toBe([2, 4]);
});

test('users cannot update tasks that belong to others', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();
    $task = RoutineTask::factory()->for($owner)->create();

    $this->actingAs($other);

    $this->put(route('routine-tasks.update', $task), [
        'name' => 'Hijacked',
        'weekdays' => [1],
        'starts_on' => now()->toDateString(),
        'ends_on' => now()->addMonth()->toDateString(),
    ])->assertForbidden();
});

test('users can delete their own routine task', function () {
    $user = User::factory()->create();
    $task = RoutineTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->delete(route('routine-tasks.destroy', $task))->assertRedirect();

    $this->assertDatabaseMissing('routine_tasks', ['id' => $task->id]);
});

test('users can mark a task done for today', function () {
    $user = User::factory()->create();
    $task = RoutineTask::factory()->for($user)->create([
        'starts_on' => now()->subWeek()->toDateString(),
        'ends_on' => now()->addWeek()->toDateString(),
    ]);
    $this->actingAs($user);

    $response = $this->post(route('routine-tasks.log', $task), [
        'log_date' => now()->toDateString(),
        'status' => 'done',
    ]);

    $response->assertRedirect();
    $log = $task->logs()->first();
    expect($log)->not->toBeNull();
    expect($log->log_date->toDateString())->toBe(now()->toDateString());
    expect($log->status)->toBe(RoutineTaskStatus::Done);
});

test('logging the same date twice updates the status', function () {
    $user = User::factory()->create();
    $task = RoutineTask::factory()->for($user)->create();
    $this->actingAs($user);

    $date = now()->subDay()->toDateString();

    $this->post(route('routine-tasks.log', $task), ['log_date' => $date, 'status' => 'done']);
    $this->post(route('routine-tasks.log', $task), ['log_date' => $date, 'status' => 'skipped']);

    expect($task->logs()->count())->toBe(1);
    expect($task->logs()->first()->status->value)->toBe('skipped');
});

test('omitting status clears the log entry', function () {
    $user = User::factory()->create();
    $task = RoutineTask::factory()->for($user)->create();
    RoutineTaskLog::factory()->for($task, 'routineTask')->create([
        'log_date' => now()->toDateString(),
        'status' => RoutineTaskStatus::Done,
    ]);
    $this->actingAs($user);

    $this->post(route('routine-tasks.log', $task), [
        'log_date' => now()->toDateString(),
    ])->assertRedirect();

    $this->assertDatabaseMissing('routine_task_logs', [
        'routine_task_id' => $task->id,
        'log_date' => now()->toDateString(),
    ]);
});

test('cannot log a future date', function () {
    $user = User::factory()->create();
    $task = RoutineTask::factory()->for($user)->create();
    $this->actingAs($user);

    $this->from(route('daily-routine.index'))
        ->post(route('routine-tasks.log', $task), [
            'log_date' => now()->addDay()->toDateString(),
            'status' => 'done',
        ])
        ->assertSessionHasErrors('log_date');
});

test('calendar reports completion percentage per day', function () {
    $user = User::factory()->create();

    $task1 = RoutineTask::factory()->for($user)->create([
        'weekdays' => [1, 2, 3, 4, 5, 6, 7],
        'starts_on' => now()->subDays(3)->toDateString(),
        'ends_on' => now()->addDays(3)->toDateString(),
    ]);

    $task2 = RoutineTask::factory()->for($user)->create([
        'weekdays' => [1, 2, 3, 4, 5, 6, 7],
        'starts_on' => now()->subDays(3)->toDateString(),
        'ends_on' => now()->addDays(3)->toDateString(),
    ]);

    $yesterday = now()->subDay()->toDateString();
    RoutineTaskLog::factory()->for($task1, 'routineTask')->create([
        'log_date' => $yesterday,
        'status' => RoutineTaskStatus::Done,
    ]);
    RoutineTaskLog::factory()->for($task2, 'routineTask')->create([
        'log_date' => $yesterday,
        'status' => RoutineTaskStatus::Skipped,
    ]);

    $this->actingAs($user);

    $response = $this->get(route('daily-routine.index'));

    $response->assertInertia(function ($page) use ($yesterday) {
        $calendar = collect($page->toArray()['props']['calendar']);
        $entry = $calendar->firstWhere('date', $yesterday);

        expect($entry['scheduled'])->toBe(2);
        expect($entry['done'])->toBe(1);
        expect($entry['skipped'])->toBe(1);
        // 1 done out of 1 countable (2 - 1 skipped) = 100%
        expect($entry['percent'])->toBe(100);
    });
});
