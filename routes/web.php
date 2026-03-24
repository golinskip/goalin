<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RewardController;
use Illuminate\Support\Facades\Route;
use Laravel\Fortify\Features;

Route::inertia('/', 'welcome', [
    'canRegister' => Features::enabled(Features::registration()),
])->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::post('activity-logs', [ActivityLogController::class, 'store'])->name('activity-logs.store');
    Route::get('activities/{activity}/timer', [ActivityLogController::class, 'timer'])->name('activities.timer');

    Route::patch('rewards/reorder', [RewardController::class, 'reorder'])->name('rewards.reorder');
    Route::resource('rewards', RewardController::class)->except(['show']);

    Route::patch('activities/reorder', [ActivityController::class, 'reorder'])->name('activities.reorder');
    Route::resource('activities', ActivityController::class)->except(['show']);
});

require __DIR__.'/settings.php';
