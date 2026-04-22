<?php

use Domain\Tools\GoalTracker\Models\Reward;
use Domain\User\Models\User;
use Domain\User\Models\UserSetting;

test('guests cannot access general settings', function () {
    $this->get(route('general.edit'))->assertRedirect(route('login'));
});

test('user can view general settings page', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('general.edit'))
        ->assertOk();
});

test('settings are created on first visit if missing', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('general.edit'));

    $user->refresh();
    expect($user->setting)->not->toBeNull();
    expect($user->setting->currency->value)->toBe('EUR');
    expect((float) $user->setting->multiplier)->toBe(1.00);
});

test('user can update currency and multiplier', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->patch(route('general.update'), [
            'currency' => 'PLN',
            'multiplier' => 5.50,
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('general.edit'));

    $user->refresh();
    expect($user->setting->currency->value)->toBe('PLN');
    expect((float) $user->setting->multiplier)->toBe(5.50);
});

test('invalid currency is rejected', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->patch(route('general.update'), [
            'currency' => 'INVALID',
            'multiplier' => 1.00,
        ])
        ->assertSessionHasErrors('currency');
});

test('multiplier must be positive', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->patch(route('general.update'), [
            'currency' => 'EUR',
            'multiplier' => 0,
        ])
        ->assertSessionHasErrors('multiplier');
});

test('changing multiplier recalculates all reward points', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id, 'multiplier' => 1.00]);

    $reward1 = Reward::factory()->create([
        'user_id' => $user->id,
        'cost_in_money' => 10.00,
        'cost_in_points' => 10,
    ]);
    $reward2 = Reward::factory()->create([
        'user_id' => $user->id,
        'cost_in_money' => 25.50,
        'cost_in_points' => 26,
    ]);

    $this->actingAs($user)
        ->patch(route('general.update'), [
            'currency' => 'EUR',
            'multiplier' => 3.00,
        ]);

    expect($reward1->refresh()->cost_in_points)->toBe(30);
    expect($reward2->refresh()->cost_in_points)->toBe(77);
});

test('user can update background', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id]);

    $backgrounds = collect(glob(public_path('img/backgrounds/*.png')))
        ->map(fn (string $path) => pathinfo($path, PATHINFO_FILENAME))
        ->values();

    $this->actingAs($user)
        ->patch(route('general.update'), [
            'currency' => 'EUR',
            'multiplier' => 1.00,
            'background' => $backgrounds->first(),
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('general.edit'));

    $user->refresh();
    expect($user->setting->background)->toBe($backgrounds->first());
});

test('invalid background is rejected', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->patch(route('general.update'), [
            'currency' => 'EUR',
            'multiplier' => 1.00,
            'background' => 'nonexistent_background',
        ])
        ->assertSessionHasErrors('background');
});

test('user can update ringtones', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->patch(route('general.update'), [
            'currency' => 'EUR',
            'multiplier' => 1.00,
            'task_ringtone' => 'chime',
            'break_ringtone' => 'bell',
        ])
        ->assertSessionHasNoErrors()
        ->assertRedirect(route('general.edit'));

    $user->refresh();
    expect($user->setting->task_ringtone->value)->toBe('chime');
    expect($user->setting->break_ringtone->value)->toBe('bell');
});

test('invalid ringtone is rejected', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->patch(route('general.update'), [
            'currency' => 'EUR',
            'multiplier' => 1.00,
            'task_ringtone' => 'not_a_real_ringtone',
        ])
        ->assertSessionHasErrors('task_ringtone');
});
