<?php

use Domain\GoalTracker\Controllers\ActivityController;
use Domain\GoalTracker\Controllers\ActivityLogController;
use Domain\GoalTracker\Controllers\DashboardController;
use Domain\GoalTracker\Controllers\GoalController;
use Domain\GoalTracker\Controllers\RewardController;
use Domain\GoalTracker\Controllers\StatisticsController;
use Domain\Tools\Flashcards\Controllers\MemoCardController;
use Domain\Tools\Flashcards\Controllers\MemoSetController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');
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
});

require __DIR__.'/settings.php';
