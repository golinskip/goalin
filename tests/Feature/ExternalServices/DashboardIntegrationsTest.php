<?php

use Domain\ExternalServices\Enums\ServiceType;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Http;
use Inertia\Testing\AssertableInertia as Assert;

test('dashboard shows hidden integrations section when nothing is connected', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->where('integrations.googleCalendar.connected', false)
        );
});

test('the dashboard no longer carries a Todoist widget', function () {
    Http::fake();

    $user = User::factory()->create();
    $user->serviceConnections()->create([
        'service' => ServiceType::Todoist->value,
        'access_token' => 'token',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('dashboard')
            ->missing('integrations.todoist')
        );

    Http::assertNothingSent();
});
