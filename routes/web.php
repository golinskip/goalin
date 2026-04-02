<?php

use Domain\Tools\Diary\Controllers\DiaryController;
use Domain\Tools\Flashcards\Controllers\MemoCardController;
use Domain\Tools\Flashcards\Controllers\MemoSetController;
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
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

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

    Route::get('diary', [DiaryController::class, 'index'])->name('diary.index');
    Route::get('diary/table', [DiaryController::class, 'table'])->name('diary.table');
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

    Route::post('playlists', [PlaylistController::class, 'store'])->name('playlists.store');
    Route::get('playlists/{playlist}', [PlaylistController::class, 'show'])->name('playlists.show');
    Route::put('playlists/{playlist}', [PlaylistController::class, 'update'])->name('playlists.update');
    Route::delete('playlists/{playlist}', [PlaylistController::class, 'destroy'])->name('playlists.destroy');
    Route::post('playlists/{playlist}/tracks', [PlaylistController::class, 'addTrack'])->name('playlists.add-track');
    Route::delete('playlists/{playlist}/tracks/{music_file}', [PlaylistController::class, 'removeTrack'])->name('playlists.remove-track');
});

require __DIR__.'/settings.php';
