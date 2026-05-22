<?php

use Domain\Admin\Controllers\AdminController;
use Domain\Admin\Controllers\RegistrationSettingController;
use Domain\Admin\Controllers\UserLockController;
use Domain\Admin\Support\RegistrationSetting;
use Domain\Tools\DailyRoutine\Controllers\DailyRoutineController;
use Domain\Tools\DailyRoutine\Controllers\RoutineTaskController;
use Domain\Tools\DailyRoutine\Controllers\RoutineTaskLogController;
use Domain\Tools\Diary\Controllers\DiaryController;
use Domain\Tools\Flashcards\Controllers\MemoCardController;
use Domain\Tools\Flashcards\Controllers\MemoSetController;
use Domain\Tools\Games\Controllers\GameResultController;
use Domain\Tools\Games\Controllers\GamesController;
use Domain\Tools\Games\Games\Addition\AdditionController;
use Domain\Tools\Games\Games\AimTrainer\AimTrainerController;
use Domain\Tools\Games\Games\Memory\MemoryController;
use Domain\Tools\Games\Games\Reflex\ReflexController;
use Domain\Tools\Games\Games\Serve\ServeController;
use Domain\Tools\Games\Games\Volleyball\VolleyballController;
use Domain\Tools\GoalTracker\Controllers\ActivityController;
use Domain\Tools\GoalTracker\Controllers\ActivityLogController;
use Domain\Tools\GoalTracker\Controllers\DashboardController;
use Domain\Tools\GoalTracker\Controllers\GoalController;
use Domain\Tools\GoalTracker\Controllers\GoalTrackerController;
use Domain\Tools\GoalTracker\Controllers\RewardController;
use Domain\Tools\GoalTracker\Controllers\StatisticsController;
use Domain\Tools\LongTermGoals\Controllers\GoalCategoryController;
use Domain\Tools\LongTermGoals\Controllers\GoalPeriodReviewController;
use Domain\Tools\LongTermGoals\Controllers\LongTermGoalController;
use Domain\Tools\LongTermGoals\Controllers\LongTermGoalsController;
use Domain\Tools\MusicPlayer\Controllers\MusicFileController;
use Domain\Tools\MusicPlayer\Controllers\PlaylistController;
use Domain\Tools\RssFeeds\Controllers\RssFeedController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', fn () => Inertia::render('welcome', [
    'canRegister' => Features::enabled(Features::registration()) && RegistrationSetting::isEnabled(),
]))->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    // Goal Tracker
    Route::get('goal-tracker', GoalTrackerController::class)->name('goal-tracker.index');
    Route::get('statistics', StatisticsController::class)->name('statistics');

    Route::post('activity-logs', [ActivityLogController::class, 'store'])->name('activity-logs.store');
    Route::get('activities/{activity}/timer', [ActivityLogController::class, 'timer'])->name('activities.timer');

    Route::patch('rewards/reorder', [RewardController::class, 'reorder'])->name('rewards.reorder');
    Route::resource('rewards', RewardController::class)->except(['show']);

    Route::patch('activities/reorder', [ActivityController::class, 'reorder'])->name('activities.reorder');
    Route::resource('activities', ActivityController::class)->except(['show']);

    Route::patch('goals/reorder', [GoalController::class, 'reorder'])->name('goals.reorder');
    Route::resource('goals', GoalController::class)->except(['show']);

    Route::get('memo-sets/{memo_set}/learn', [MemoSetController::class, 'learn'])->name('memo-sets.learn');
    Route::get('memo-sets/{memo_set}/export', [MemoSetController::class, 'export'])->name('memo-sets.export');
    Route::post('memo-sets/{memo_set}/import', [MemoSetController::class, 'import'])->name('memo-sets.import');
    Route::resource('memo-sets', MemoSetController::class);
    Route::post('memo-sets/{memo_set}/cards', [MemoCardController::class, 'store'])->name('memo-cards.store');
    Route::put('memo-cards/{memo_card}', [MemoCardController::class, 'update'])->name('memo-cards.update');
    Route::delete('memo-cards/{memo_card}', [MemoCardController::class, 'destroy'])->name('memo-cards.destroy');
    Route::post('memo-cards/{memo_card}/review', [MemoCardController::class, 'review'])->name('memo-cards.review');
    Route::patch('memo-cards/{memo_card}/note', [MemoCardController::class, 'updateNote'])->name('memo-cards.update-note');

    Route::get('diary', [DiaryController::class, 'index'])->name('diary.index');
    Route::get('diary/table', [DiaryController::class, 'table'])->name('diary.table');
    Route::get('diary/export', [DiaryController::class, 'export'])->name('diary.export');
    Route::post('diary', [DiaryController::class, 'store'])->name('diary.store');
    Route::put('diary/{diary_entry}', [DiaryController::class, 'update'])->name('diary.update');
    Route::delete('diary/{diary_entry}', [DiaryController::class, 'destroy'])->name('diary.destroy');

    // Music Player
    Route::get('music', [MusicFileController::class, 'index'])->name('music.index');
    Route::get('music/library', [MusicFileController::class, 'library'])->name('music.library');
    Route::post('music', [MusicFileController::class, 'store'])->name('music.store');
    Route::put('music/{music_file}', [MusicFileController::class, 'update'])->name('music.update');
    Route::delete('music/{music_file}', [MusicFileController::class, 'destroy'])->name('music.destroy');
    Route::get('music/{music_file}/stream', [MusicFileController::class, 'stream'])->name('music.stream');

    // Long Term Goals
    Route::get('long-term-goals', LongTermGoalsController::class)->name('long-term-goals.index');
    Route::post('long-term-goals/categories', [GoalCategoryController::class, 'store'])->name('goal-categories.store');
    Route::put('long-term-goals/categories/{goal_category}', [GoalCategoryController::class, 'update'])->name('goal-categories.update');
    Route::delete('long-term-goals/categories/{goal_category}', [GoalCategoryController::class, 'destroy'])->name('goal-categories.destroy');
    Route::post('long-term-goals/goals', [LongTermGoalController::class, 'store'])->name('long-term-goals.store');
    Route::put('long-term-goals/goals/{long_term_goal}', [LongTermGoalController::class, 'update'])->name('long-term-goals.update');
    Route::delete('long-term-goals/goals/{long_term_goal}', [LongTermGoalController::class, 'destroy'])->name('long-term-goals.destroy');
    Route::put('long-term-goals/periods/{goal_period}/review', GoalPeriodReviewController::class)->name('long-term-goals.review');

    // Games
    Route::get('games', GamesController::class)->name('games.index');
    Route::get('games/reflex', ReflexController::class)->name('games.reflex');
    Route::get('games/addition', AdditionController::class)->name('games.addition');
    Route::get('games/volleyball', VolleyballController::class)->name('games.volleyball');
    Route::get('games/serve', ServeController::class)->name('games.serve');
    Route::get('games/aim-trainer', AimTrainerController::class)->name('games.aim-trainer');
    Route::get('games/memory', MemoryController::class)->name('games.memory');
    Route::post('games/results', [GameResultController::class, 'store'])->name('games.results.store');

    // Daily Routine
    Route::get('daily-routine', [DailyRoutineController::class, 'index'])->name('daily-routine.index');
    Route::post('routine-tasks', [RoutineTaskController::class, 'store'])->name('routine-tasks.store');
    Route::put('routine-tasks/{routine_task}', [RoutineTaskController::class, 'update'])->name('routine-tasks.update');
    Route::delete('routine-tasks/{routine_task}', [RoutineTaskController::class, 'destroy'])->name('routine-tasks.destroy');
    Route::post('routine-tasks/{routine_task}/log', [RoutineTaskLogController::class, 'store'])->name('routine-tasks.log');
    Route::post('routine-tasks/{routine_task}/comment', [RoutineTaskLogController::class, 'comment'])->name('routine-tasks.comment');

    // RSS Feeds
    Route::get('rss-feeds', [RssFeedController::class, 'index'])->name('rss-feeds.index');
    Route::post('rss-feeds', [RssFeedController::class, 'store'])->name('rss-feeds.store');
    Route::put('rss-feeds/{rss_feed}', [RssFeedController::class, 'update'])->name('rss-feeds.update');
    Route::delete('rss-feeds/{rss_feed}', [RssFeedController::class, 'destroy'])->name('rss-feeds.destroy');
    Route::post('rss-feeds/{rss_feed}/refresh', [RssFeedController::class, 'refresh'])->name('rss-feeds.refresh');
    Route::post('rss-feeds/refresh-all', [RssFeedController::class, 'refreshAll'])->name('rss-feeds.refresh-all');
    Route::post('rss-articles/{rss_article}/toggle-read', [RssFeedController::class, 'toggleRead'])->name('rss-articles.toggle-read');
    Route::post('rss-articles/{rss_article}/mark-read', [RssFeedController::class, 'markRead'])->name('rss-articles.mark-read');

    // Super Admin
    Route::middleware('super-admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/', AdminController::class)->name('index');
        Route::patch('registration', [RegistrationSettingController::class, 'update'])->name('registration.update');
        Route::post('users/{user}/lock', [UserLockController::class, 'store'])->name('users.lock');
        Route::delete('users/{user}/lock', [UserLockController::class, 'destroy'])->name('users.unlock');
    });

    Route::post('playlists', [PlaylistController::class, 'store'])->name('playlists.store');
    Route::get('playlists/{playlist}', [PlaylistController::class, 'show'])->name('playlists.show');
    Route::put('playlists/{playlist}', [PlaylistController::class, 'update'])->name('playlists.update');
    Route::delete('playlists/{playlist}', [PlaylistController::class, 'destroy'])->name('playlists.destroy');
    Route::get('playlists/{playlist}/tracks', [PlaylistController::class, 'tracks'])->name('playlists.tracks');
    Route::post('playlists/{playlist}/tracks', [PlaylistController::class, 'addTrack'])->name('playlists.add-track');
    Route::delete('playlists/{playlist}/tracks/{music_file}', [PlaylistController::class, 'removeTrack'])->name('playlists.remove-track');
    Route::patch('playlists/{playlist}/tracks/reorder', [PlaylistController::class, 'reorderTracks'])->name('playlists.reorder-tracks');
});

require __DIR__.'/settings.php';
