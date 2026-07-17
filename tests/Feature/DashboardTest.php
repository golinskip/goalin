<?php

use Carbon\Carbon;
use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\User\Models\User;
use Illuminate\Support\Collection;

test('guests are redirected to the login page', function () {
    $response = $this->get(route('dashboard'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the dashboard', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('dashboard'));
    $response->assertOk();
});

test('dashboard alerts are tagged with tool names matching the tool tiles', function () {
    $user = User::factory()->create();
    $yesterday = Carbon::today()->subDay();
    RoutineTask::factory()->for($user)->create([
        'weekdays' => [(int) $yesterday->dayOfWeekIso],
        'starts_on' => Carbon::today()->subWeek(),
        'ends_on' => Carbon::today()->addWeek(),
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('alerts', fn (Collection $alerts) => $alerts
            ->pluck('tool')
            ->contains('Daily Routine'))
    );
});

test('dashboard shares no alerts for a tool once its tasks are marked', function () {
    $user = User::factory()->create();
    $yesterday = Carbon::today()->subDay();
    $task = RoutineTask::factory()->for($user)->create([
        'weekdays' => [(int) $yesterday->dayOfWeekIso],
        'starts_on' => Carbon::today()->subWeek(),
        'ends_on' => Carbon::today()->addWeek(),
    ]);
    $task->logs()->create([
        'log_date' => $yesterday,
        'status' => RoutineTaskStatus::Done,
    ]);

    $response = $this->actingAs($user)->get(route('dashboard'));

    $response->assertInertia(fn ($page) => $page
        ->where('alerts', fn (Collection $alerts) => ! $alerts
            ->pluck('tool')
            ->contains('Daily Routine'))
    );
});
