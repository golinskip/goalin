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
            ->where('integrations.todoist.connected', false)
            ->where('integrations.googleCalendar.connected', false)
        );
});

test('dashboard flags Todoist as connected when a connection exists', function () {
    Http::fake([
        'api.todoist.com/rest/v2/tasks*' => Http::response([
            [
                'id' => '123',
                'content' => 'Buy groceries',
                'url' => 'https://app.todoist.com/task/123',
                'due' => ['date' => '2026-04-23'],
                'priority' => 2,
                'project_id' => '42',
            ],
        ], 200),
    ]);

    $user = User::factory()->create();
    $user->serviceConnections()->create([
        'service' => ServiceType::Todoist->value,
        'access_token' => 'token',
    ]);

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('integrations.todoist.connected', true)
            ->where('integrations.googleCalendar.connected', false)
        );
});
