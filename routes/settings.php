<?php

use Domain\ExternalServices\Controllers\ExternalServicesController;
use Domain\ExternalServices\Controllers\GoogleCalendarConnectionController;
use Domain\ExternalServices\Controllers\TodoistConnectionController;
use Domain\User\Controllers\GeneralController;
use Domain\User\Controllers\ProfileController;
use Domain\User\Controllers\SecurityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth'])->group(function () {
    Route::redirect('settings', '/settings/profile');

    Route::get('settings/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('settings/profile', [ProfileController::class, 'update'])->name('profile.update');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::delete('settings/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    Route::get('settings/security', [SecurityController::class, 'edit'])->name('security.edit');

    Route::put('settings/password', [SecurityController::class, 'update'])
        ->middleware('throttle:6,1')
        ->name('user-password.update');

    Route::inertia('settings/appearance', 'settings/appearance')->name('appearance.edit');

    Route::get('settings/general', [GeneralController::class, 'edit'])->name('general.edit');
    Route::patch('settings/general', [GeneralController::class, 'update'])->name('general.update');

    Route::get('settings/external-services', [ExternalServicesController::class, 'edit'])->name('external-services.edit');
    Route::post('settings/external-services/todoist', [TodoistConnectionController::class, 'store'])->name('external-services.todoist.store');
    Route::delete('settings/external-services/todoist', [TodoistConnectionController::class, 'destroy'])->name('external-services.todoist.destroy');
    Route::get('settings/external-services/google-calendar/redirect', [GoogleCalendarConnectionController::class, 'redirect'])->name('external-services.google-calendar.redirect');
    Route::get('settings/external-services/google-calendar/callback', [GoogleCalendarConnectionController::class, 'callback'])->name('external-services.google-calendar.callback');
    Route::delete('settings/external-services/google-calendar', [GoogleCalendarConnectionController::class, 'destroy'])->name('external-services.google-calendar.destroy');
});
