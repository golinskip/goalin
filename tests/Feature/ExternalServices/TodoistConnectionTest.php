<?php

use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Models\ServiceConnection;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Http;

test('guests cannot access external services settings', function () {
    $this->get(route('external-services.edit'))->assertRedirect(route('login'));
});

test('user can view external services settings', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('external-services.edit'))
        ->assertOk();
});

test('user can connect Todoist with a valid api token', function () {
    Http::fake([
        'api.todoist.com/rest/v2/projects' => Http::response([], 200),
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('external-services.todoist.store'), [
            'api_token' => 'a-valid-todoist-token',
        ])
        ->assertRedirect(route('external-services.edit'))
        ->assertSessionHasNoErrors();

    $connection = ServiceConnection::query()
        ->where('user_id', $user->id)
        ->where('service', ServiceType::Todoist->value)
        ->first();

    expect($connection)->not->toBeNull()
        ->and($connection->access_token)->toBe('a-valid-todoist-token');
});

test('invalid Todoist tokens are rejected', function () {
    Http::fake([
        'api.todoist.com/rest/v2/projects' => Http::response(['error' => 'unauthorized'], 401),
    ]);

    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('external-services.todoist.store'), [
            'api_token' => 'bad-token-value',
        ])
        ->assertSessionHasErrors('api_token');

    expect(ServiceConnection::query()->count())->toBe(0);
});

test('Todoist api token is required', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('external-services.todoist.store'), [])
        ->assertSessionHasErrors('api_token');
});

test('user can disconnect Todoist', function () {
    $user = User::factory()->create();

    $user->serviceConnections()->create([
        'service' => ServiceType::Todoist->value,
        'access_token' => 'some-token',
    ]);

    $this->actingAs($user)
        ->delete(route('external-services.todoist.destroy'))
        ->assertRedirect(route('external-services.edit'));

    expect(ServiceConnection::query()->count())->toBe(0);
});

test('user cannot disconnect another users Todoist', function () {
    $owner = User::factory()->create();
    $other = User::factory()->create();

    $owner->serviceConnections()->create([
        'service' => ServiceType::Todoist->value,
        'access_token' => 'some-token',
    ]);

    $this->actingAs($other)
        ->delete(route('external-services.todoist.destroy'))
        ->assertRedirect(route('external-services.edit'));

    expect(ServiceConnection::query()->where('user_id', $owner->id)->count())->toBe(1);
});
