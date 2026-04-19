<?php

use Domain\Admin\Support\RegistrationSetting;
use Domain\User\Models\User;

test('super admin can access admin panel', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);

    $this->actingAs($admin)
        ->get('/admin')
        ->assertOk()
        ->assertInertia(fn ($page) => $page
            ->component('admin/index')
            ->has('users')
            ->has('registrationEnabled')
        );
});

test('regular users cannot access admin panel', function () {
    $user = User::factory()->create(['is_super_admin' => false]);

    $this->actingAs($user)->get('/admin')->assertForbidden();
});

test('guests are redirected when accessing admin panel', function () {
    $this->get('/admin')->assertRedirect('/login');
});

test('super admin can lock a regular user', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);
    $victim = User::factory()->create();

    $this->actingAs($admin)->post("/admin/users/{$victim->id}/lock")->assertRedirect();

    expect($victim->fresh()->isLocked())->toBeTrue();
});

test('super admin can unlock a locked user', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);
    $locked = User::factory()->create(['locked_at' => now()]);

    $this->actingAs($admin)->delete("/admin/users/{$locked->id}/lock")->assertRedirect();

    expect($locked->fresh()->isLocked())->toBeFalse();
});

test('super admin cannot lock another super admin', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);
    $other = User::factory()->create(['is_super_admin' => true]);

    $this->actingAs($admin)
        ->post("/admin/users/{$other->id}/lock")
        ->assertSessionHasErrors('user');

    expect($other->fresh()->isLocked())->toBeFalse();
});

test('super admin cannot lock themselves', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);

    $this->actingAs($admin)
        ->post("/admin/users/{$admin->id}/lock")
        ->assertSessionHasErrors('user');

    expect($admin->fresh()->isLocked())->toBeFalse();
});

test('super admin can toggle registration setting', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);

    $this->actingAs($admin)
        ->patch('/admin/registration', ['enabled' => true])
        ->assertRedirect();

    expect(RegistrationSetting::isEnabled())->toBeTrue();

    $this->actingAs($admin)
        ->patch('/admin/registration', ['enabled' => false])
        ->assertRedirect();

    expect(RegistrationSetting::isEnabled())->toBeFalse();
});

test('registration is disabled by default', function () {
    expect(RegistrationSetting::isEnabled())->toBeFalse();
});

test('registration request fails when registration is disabled', function () {
    RegistrationSetting::setEnabled(false);

    $this->post('/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'Password1!Password1!',
        'password_confirmation' => 'Password1!Password1!',
    ])->assertSessionHasErrors('email');

    expect(User::where('email', 'jane@example.com')->exists())->toBeFalse();
});

test('registration works when the flag is enabled', function () {
    RegistrationSetting::setEnabled(true);

    $this->post('/register', [
        'name' => 'Jane Doe',
        'email' => 'jane@example.com',
        'password' => 'Password1!Password1!',
        'password_confirmation' => 'Password1!Password1!',
    ])->assertSessionHasNoErrors();

    expect(User::where('email', 'jane@example.com')->exists())->toBeTrue();
});

test('locked user is logged out when visiting authenticated routes', function () {
    $locked = User::factory()->create(['locked_at' => now()]);

    $response = $this->actingAs($locked)->get('/dashboard');

    $response->assertRedirect(route('home'));
    $this->assertGuest();
});

test('assign super admin artisan command promotes a user', function () {
    $user = User::factory()->create(['email' => 'boss@example.com']);

    $this->artisan('super-admin:assign', ['email' => 'boss@example.com'])
        ->assertSuccessful();

    expect($user->fresh()->isSuperAdmin())->toBeTrue();
});

test('assign super admin artisan command fails for unknown email', function () {
    $this->artisan('super-admin:assign', ['email' => 'ghost@example.com'])
        ->assertFailed();
});

test('revoke super admin artisan command demotes a user', function () {
    $admin = User::factory()->create(['is_super_admin' => true]);

    $this->artisan('super-admin:revoke', ['email' => $admin->email])
        ->assertSuccessful();

    expect($admin->fresh()->isSuperAdmin())->toBeFalse();
});
