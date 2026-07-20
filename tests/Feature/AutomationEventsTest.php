<?php

use Domain\Automation\AutomationRunner;
use Domain\Tools\DailyRoutine\Enums\RoutineTaskStatus;
use Domain\Tools\DailyRoutine\Events\DailyRoutineTasksEvent;
use Domain\Tools\DailyRoutine\Events\SpecificRoutineTaskEvent;
use Domain\Tools\DailyRoutine\Models\RoutineTask;
use Domain\Tools\Diary\Events\NoEmptyDiaryDaysEvent;
use Domain\Tools\GoalTracker\Enums\ActivityType;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\Tools\LongTermGoals\Enums\GoalStatus;
use Domain\Tools\LongTermGoals\Events\LongTermGoalsProgressEvent;
use Domain\Tools\LongTermGoals\Events\ReviewedLongTermGoalsEvent;
use Domain\Tools\LongTermGoals\Models\GoalPeriod;
use Domain\Tools\LongTermGoals\Models\LongTermGoal;
use Domain\Tools\RssFeeds\Events\ReadArticlesEvent;
use Domain\Tools\RssFeeds\Models\RssArticle;
use Domain\Tools\RssFeeds\Models\RssFeed;
use Domain\User\Models\User;

function scheduledRoutineTask(User $user): RoutineTask
{
    return RoutineTask::factory()->for($user)->create([
        'weekdays' => [now()->dayOfWeekIso],
    ]);
}

function markRoutineDone(RoutineTask $task, ?string $date = null): void
{
    $task->logs()->create([
        'log_date' => $date ?? now()->toDateString(),
        'status' => RoutineTaskStatus::Done,
    ]);
}

/*
|--------------------------------------------------------------------------
| Daily Routine — complete routine tasks
|--------------------------------------------------------------------------
*/

it('awards the routine-tasks event once the target number of tasks is done', function () {
    $user = User::factory()->create();
    $first = scheduledRoutineTask($user);
    $second = scheduledRoutineTask($user);

    $automated = Activity::factory()->for($user)
        ->automated(DailyRoutineTasksEvent::KEY, ['count' => 2])
        ->create(['point_cost' => 10]);

    markRoutineDone($first);
    app(AutomationRunner::class)->fire(DailyRoutineTasksEvent::KEY, $user);
    expect($automated->logs()->count())->toBe(0);

    markRoutineDone($second);
    app(AutomationRunner::class)->fire(DailyRoutineTasksEvent::KEY, $user);

    expect($automated->logs()->count())->toBe(1)
        ->and((int) $automated->logs()->sum('points_earned'))->toBe(10);
});

it('treats a count of zero as every task scheduled today', function () {
    $user = User::factory()->create();
    $first = scheduledRoutineTask($user);
    $second = scheduledRoutineTask($user);

    $automated = Activity::factory()->for($user)
        ->automated(DailyRoutineTasksEvent::KEY, ['count' => 0])
        ->create();

    markRoutineDone($first);
    app(AutomationRunner::class)->fire(DailyRoutineTasksEvent::KEY, $user);
    expect($automated->logs()->count())->toBe(0);

    markRoutineDone($second);
    app(AutomationRunner::class)->fire(DailyRoutineTasksEvent::KEY, $user);
    expect($automated->logs()->count())->toBe(1);
});

it('never awards the routine-tasks event twice in one day', function () {
    $user = User::factory()->create();
    $task = scheduledRoutineTask($user);

    $automated = Activity::factory()->for($user)
        ->automated(DailyRoutineTasksEvent::KEY, ['count' => 1])
        ->create();

    markRoutineDone($task);

    $runner = app(AutomationRunner::class);
    $runner->fire(DailyRoutineTasksEvent::KEY, $user);
    $runner->fire(DailyRoutineTasksEvent::KEY, $user);

    expect($automated->logs()->count())->toBe(1);
});

it('fires the routine-tasks event through the routine log controller', function () {
    $user = User::factory()->create();
    $task = scheduledRoutineTask($user);

    $automated = Activity::factory()->for($user)
        ->automated(DailyRoutineTasksEvent::KEY, ['count' => 1])
        ->create(['point_cost' => 4]);

    $this->actingAs($user)
        ->post(route('routine-tasks.log', $task), [
            'log_date' => now()->toDateString(),
            'status' => RoutineTaskStatus::Done->value,
        ])
        ->assertRedirect();

    expect($automated->logs()->count())->toBe(1)
        ->and((int) $automated->logs()->sum('points_earned'))->toBe(4);
});

/*
|--------------------------------------------------------------------------
| Daily Routine — complete a specific routine task
|--------------------------------------------------------------------------
*/

it('awards the specific-task event only when the chosen task is done', function () {
    $user = User::factory()->create();
    $target = scheduledRoutineTask($user);
    $other = scheduledRoutineTask($user);

    $automated = Activity::factory()->for($user)
        ->automated(SpecificRoutineTaskEvent::KEY, ['routine_task_id' => $target->id])
        ->create();

    markRoutineDone($other);
    app(AutomationRunner::class)->fire(SpecificRoutineTaskEvent::KEY, $user);
    expect($automated->logs()->count())->toBe(0);

    markRoutineDone($target);
    app(AutomationRunner::class)->fire(SpecificRoutineTaskEvent::KEY, $user);
    expect($automated->logs()->count())->toBe(1);
});

it('stores an automated activity bound to a specific routine task through the form', function () {
    $user = User::factory()->create();
    $target = scheduledRoutineTask($user);

    $this->actingAs($user)
        ->post(route('activities.store'), [
            'name' => 'Mirror the routine',
            'type' => ActivityType::Automated->value,
            'event_key' => SpecificRoutineTaskEvent::KEY,
            'event_parameters' => ['routine_task_id' => $target->id],
            'point_cost' => 5,
            'color' => '#3a9a4e',
            'needs_timer' => false,
        ])
        ->assertRedirect(route('activities.index'));

    $activity = $user->activities()->where('event_key', SpecificRoutineTaskEvent::KEY)->firstOrFail();

    expect($activity->event_parameters)->toBe(['routine_task_id' => $target->id]);
});

it('exposes only the users enabled routine tasks to the create form', function () {
    $user = User::factory()->create();
    $task = scheduledRoutineTask($user);

    RoutineTask::factory()->for($user)->create([
        'starts_on' => now()->subMonth()->toDateString(),
        'ends_on' => now()->subDay()->toDateString(),
    ]);

    $this->actingAs($user)
        ->get(route('activities.create'))
        ->assertInertia(fn ($page) => $page
            ->has('availableRoutineTasks', 1)
            ->where('availableRoutineTasks.0.id', $task->id));
});

/*
|--------------------------------------------------------------------------
| Diary — keep the diary gap-free
|--------------------------------------------------------------------------
*/

it('awards the diary event when every day in the window has an entry', function () {
    $user = User::factory()->create();

    $automated = Activity::factory()->for($user)
        ->automated(NoEmptyDiaryDaysEvent::KEY, ['days' => 3])
        ->create();

    foreach ([2, 1, 0] as $daysAgo) {
        $user->diaryEntries()->create([
            'entry_date' => now()->subDays($daysAgo)->toDateString(),
            'content' => 'Entry',
        ]);
    }

    app(AutomationRunner::class)->fire(NoEmptyDiaryDaysEvent::KEY, $user);

    expect($automated->logs()->count())->toBe(1);
});

it('does not award the diary event when a day in the window is empty', function () {
    $user = User::factory()->create();

    $automated = Activity::factory()->for($user)
        ->automated(NoEmptyDiaryDaysEvent::KEY, ['days' => 3])
        ->create();

    foreach ([2, 0] as $daysAgo) {
        $user->diaryEntries()->create([
            'entry_date' => now()->subDays($daysAgo)->toDateString(),
            'content' => 'Entry',
        ]);
    }

    app(AutomationRunner::class)->fire(NoEmptyDiaryDaysEvent::KEY, $user);

    expect($automated->logs()->count())->toBe(0);
});

it('fires the diary event through the diary controller', function () {
    $user = User::factory()->create();

    $automated = Activity::factory()->for($user)
        ->automated(NoEmptyDiaryDaysEvent::KEY, ['days' => 1])
        ->create(['point_cost' => 3]);

    $this->actingAs($user)
        ->post(route('diary.store'), [
            'entry_date' => now()->toDateString(),
            'content' => 'Today was good.',
        ])
        ->assertRedirect();

    expect($automated->logs()->count())->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Long-Term Goals — review and progress
|--------------------------------------------------------------------------
*/

it('awards the review event when a period was reviewed today', function () {
    $user = User::factory()->create();
    GoalPeriod::factory()->for($user)->reviewed()->create();

    $automated = Activity::factory()->for($user)
        ->automated(ReviewedLongTermGoalsEvent::KEY, ['period' => 'any'])
        ->create();

    app(AutomationRunner::class)->fire(ReviewedLongTermGoalsEvent::KEY, $user);

    expect($automated->logs()->count())->toBe(1);
});

it('awards the progress event once the done percentage is reached', function () {
    $user = User::factory()->create();
    $period = GoalPeriod::factory()->for($user)->create();

    LongTermGoal::factory()->for($user)->for($period)->create(['status' => GoalStatus::Done]);
    LongTermGoal::factory()->for($user)->for($period)->create(['status' => GoalStatus::Done]);
    LongTermGoal::factory()->for($user)->for($period)->create(['status' => GoalStatus::Pending]);

    $automated = Activity::factory()->for($user)
        ->automated(LongTermGoalsProgressEvent::KEY, ['percent' => 60, 'period' => 'any'])
        ->create();

    app(AutomationRunner::class)->fire(LongTermGoalsProgressEvent::KEY, $user);
    expect($automated->logs()->count())->toBe(1);
});

it('does not award the progress event below the threshold', function () {
    $user = User::factory()->create();
    $period = GoalPeriod::factory()->for($user)->create();

    LongTermGoal::factory()->for($user)->for($period)->create(['status' => GoalStatus::Done]);
    LongTermGoal::factory()->for($user)->for($period)->create(['status' => GoalStatus::Pending]);
    LongTermGoal::factory()->for($user)->for($period)->create(['status' => GoalStatus::Pending]);

    $automated = Activity::factory()->for($user)
        ->automated(LongTermGoalsProgressEvent::KEY, ['percent' => 60, 'period' => 'any'])
        ->create();

    app(AutomationRunner::class)->fire(LongTermGoalsProgressEvent::KEY, $user);
    expect($automated->logs()->count())->toBe(0);
});

it('fires the long-term goal events through the review controller', function () {
    $user = User::factory()->create();
    $period = GoalPeriod::factory()->for($user)->create();
    $goal = LongTermGoal::factory()->for($user)->for($period)->create(['status' => GoalStatus::Pending]);

    $reviewed = Activity::factory()->for($user)
        ->automated(ReviewedLongTermGoalsEvent::KEY, ['period' => 'any'])
        ->create();
    $progress = Activity::factory()->for($user)
        ->automated(LongTermGoalsProgressEvent::KEY, ['percent' => 100, 'period' => 'any'])
        ->create();

    $this->actingAs($user)
        ->put(route('long-term-goals.review', $period), [
            'goals' => [
                ['id' => $goal->id, 'status' => GoalStatus::Done->value],
            ],
        ])
        ->assertRedirect();

    expect($reviewed->logs()->count())->toBe(1)
        ->and($progress->logs()->count())->toBe(1);
});

/*
|--------------------------------------------------------------------------
| RSS — read articles
|--------------------------------------------------------------------------
*/

it('awards the rss event once a day when the target is reached', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    RssArticle::factory()->count(3)->for($feed, 'feed')->create(['read_at' => now()]);

    $automated = Activity::factory()->for($user)
        ->automated(ReadArticlesEvent::KEY, ['count' => 3, 'mode' => 'daily'])
        ->create(['point_cost' => 6]);

    app(AutomationRunner::class)->fire(ReadArticlesEvent::KEY, $user);

    expect($automated->logs()->count())->toBe(1)
        ->and((int) $automated->logs()->sum('points_earned'))->toBe(6);
});

it('awards one rss unit per batch and never pays for the same batch twice', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    RssArticle::factory()->count(5)->for($feed, 'feed')->create(['read_at' => now()]);

    $automated = Activity::factory()->for($user)
        ->automated(ReadArticlesEvent::KEY, ['count' => 2, 'mode' => 'per_batch'])
        ->create();

    $runner = app(AutomationRunner::class);
    $runner->fire(ReadArticlesEvent::KEY, $user);
    $runner->fire(ReadArticlesEvent::KEY, $user);

    expect((int) $automated->logs()->sum('quantity'))->toBe(2);
});

it('fires the rss event when an article is marked read through the controller', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    $article = RssArticle::factory()->for($feed, 'feed')->create(['read_at' => null]);

    $automated = Activity::factory()->for($user)
        ->automated(ReadArticlesEvent::KEY, ['count' => 1, 'mode' => 'daily'])
        ->create();

    $this->actingAs($user)
        ->post(route('rss-articles.mark-read', $article))
        ->assertRedirect();

    expect($automated->logs()->count())->toBe(1);
});
