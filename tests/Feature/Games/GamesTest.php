<?php

use Domain\Tools\Games\Models\GameResult;
use Domain\User\Models\User;

test('guests are redirected from games index', function () {
    $response = $this->get(route('games.index'));
    $response->assertRedirect(route('login'));
});

test('authenticated users can visit the games index', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('games.index'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/games/index')
        ->has('bestResults')
    );
});

test('games index shows best results per game', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    GameResult::factory()->for($user)->create(['game' => 'reflex', 'result' => 500.5]);
    GameResult::factory()->for($user)->create(['game' => 'reflex', 'result' => 287.25]);
    GameResult::factory()->for($user)->create(['game' => 'reflex', 'result' => 420.0]);

    $response = $this->get(route('games.index'));

    $response->assertInertia(fn ($page) => $page
        ->where('bestResults.reflex.best_result', 287.25)
        ->where('bestResults.reflex.plays', 3)
    );
});

test('authenticated users can visit the reflex game page', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('games.reflex'));

    $response->assertOk();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/games/reflex/index')
        ->has('recent')
    );
});

test('users can store a game result', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->postJson(route('games.results.store'), [
        'game' => 'reflex',
        'result' => 287.5,
    ]);

    $response->assertCreated();
    $response->assertJsonStructure(['id', 'game', 'result', 'played_at']);
    $this->assertDatabaseHas('game_results', [
        'user_id' => $user->id,
        'game' => 'reflex',
        'result' => 287.5,
    ]);
});

test('storing a game result requires game and result', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->postJson(route('games.results.store'), []);

    $response->assertUnprocessable();
    $response->assertJsonValidationErrors(['game', 'result']);
});

test('guests cannot store game results', function () {
    $response = $this->postJson(route('games.results.store'), [
        'game' => 'reflex',
        'result' => 300,
    ]);

    $response->assertUnauthorized();
});
