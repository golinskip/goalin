<?php

use App\Models\Reward;
use App\Models\User;
use App\Models\UserSetting;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

test('guests cannot access rewards', function () {
    $this->get(route('rewards.index'))->assertRedirect(route('login'));
    $this->get(route('rewards.create'))->assertRedirect(route('login'));
    $this->post(route('rewards.store'))->assertRedirect(route('login'));
});

test('user can view rewards index', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('rewards.index'))
        ->assertOk();
});

test('user can view create reward form', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->get(route('rewards.create'))
        ->assertOk();
});

test('user can create a reward', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id, 'multiplier' => 2.00]);

    $response = $this->actingAs($user)
        ->post(route('rewards.store'), [
            'name' => 'New Headphones',
            'cost_in_money' => 50.00,
            'color' => '#ff5733',
        ]);

    $response->assertRedirect(route('rewards.index'));

    $reward = $user->rewards()->first();
    expect($reward)->not->toBeNull();
    expect($reward->name)->toBe('New Headphones');
    expect((float) $reward->cost_in_money)->toBe(50.00);
    expect($reward->cost_in_points)->toBe(100);
    expect($reward->color)->toBe('#ff5733');
});

test('user can create a reward with image', function () {
    Storage::fake('public');

    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->post(route('rewards.store'), [
            'name' => 'Prize',
            'cost_in_money' => 10.00,
            'color' => '#3a9a4e',
            'picture' => UploadedFile::fake()->image('reward.jpg', 200, 200),
        ]);

    $reward = $user->rewards()->first();
    expect($reward->picture)->not->toBeNull();
    Storage::disk('public')->assertExists($reward->picture);
});

test('reward creation requires valid data', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('rewards.store'), [
            'name' => '',
            'cost_in_money' => -5,
            'color' => 'invalid',
        ])
        ->assertSessionHasErrors(['name', 'cost_in_money', 'color']);
});

test('user can edit their own reward', function () {
    $user = User::factory()->create();
    $reward = Reward::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->get(route('rewards.edit', $reward))
        ->assertOk();
});

test('user cannot edit another users reward', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $reward = Reward::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->get(route('rewards.edit', $reward))
        ->assertForbidden();
});

test('user can update their own reward', function () {
    $user = User::factory()->create();
    UserSetting::factory()->create(['user_id' => $user->id, 'multiplier' => 3.00]);
    $reward = Reward::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->put(route('rewards.update', $reward), [
            'name' => 'Updated Reward',
            'cost_in_money' => 25.00,
            'color' => '#0000ff',
        ])
        ->assertRedirect(route('rewards.index'));

    $reward->refresh();
    expect($reward->name)->toBe('Updated Reward');
    expect((float) $reward->cost_in_money)->toBe(25.00);
    expect($reward->cost_in_points)->toBe(75);
    expect($reward->color)->toBe('#0000ff');
});

test('user cannot update another users reward', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $reward = Reward::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->put(route('rewards.update', $reward), [
            'name' => 'Hacked',
            'cost_in_money' => 1.00,
            'color' => '#000000',
        ])
        ->assertForbidden();
});

test('user can delete their own reward', function () {
    $user = User::factory()->create();
    $reward = Reward::factory()->create(['user_id' => $user->id]);

    $this->actingAs($user)
        ->delete(route('rewards.destroy', $reward))
        ->assertRedirect(route('rewards.index'));

    expect($reward->fresh())->toBeNull();
});

test('user cannot delete another users reward', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();
    $reward = Reward::factory()->create(['user_id' => $other->id]);

    $this->actingAs($user)
        ->delete(route('rewards.destroy', $reward))
        ->assertForbidden();

    expect($reward->fresh())->not->toBeNull();
});

test('user can reorder rewards', function () {
    $user = User::factory()->create();
    $reward1 = Reward::factory()->create(['user_id' => $user->id, 'sort_order' => 0]);
    $reward2 = Reward::factory()->create(['user_id' => $user->id, 'sort_order' => 1]);

    $this->actingAs($user)
        ->patch(route('rewards.reorder'), [
            'order' => [
                ['id' => $reward2->id, 'sort_order' => 0],
                ['id' => $reward1->id, 'sort_order' => 1],
            ],
        ])
        ->assertRedirect(route('rewards.index'));

    expect($reward1->refresh()->sort_order)->toBe(1);
    expect($reward2->refresh()->sort_order)->toBe(0);
});

test('cost in points is auto-calculated with default multiplier', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('rewards.store'), [
            'name' => 'Test',
            'cost_in_money' => 10.00,
            'color' => '#aabbcc',
        ]);

    $reward = $user->rewards()->first();
    expect($reward->cost_in_points)->toBe(10);
});

test('user can create a reward with shop url and description', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('rewards.store'), [
            'name' => 'Gaming Mouse',
            'cost_in_money' => 75.00,
            'color' => '#3a9a4e',
            'shop_url' => 'https://example.com/mouse',
            'description' => 'Ergonomic wireless gaming mouse',
        ])
        ->assertRedirect(route('rewards.index'));

    $reward = $user->rewards()->first();
    expect($reward->shop_url)->toBe('https://example.com/mouse');
    expect($reward->description)->toBe('Ergonomic wireless gaming mouse');
});

test('shop url and description are optional', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('rewards.store'), [
            'name' => 'Simple Prize',
            'cost_in_money' => 10.00,
            'color' => '#aabbcc',
        ])
        ->assertRedirect(route('rewards.index'));

    $reward = $user->rewards()->first();
    expect($reward->shop_url)->toBeNull();
    expect($reward->description)->toBeNull();
});

test('shop url must be a valid url', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->post(route('rewards.store'), [
            'name' => 'Test',
            'cost_in_money' => 10.00,
            'color' => '#aabbcc',
            'shop_url' => 'not-a-url',
        ])
        ->assertSessionHasErrors('shop_url');
});

test('user can update shop url and description', function () {
    $user = User::factory()->create();
    $reward = Reward::factory()->create([
        'user_id' => $user->id,
        'shop_url' => null,
        'description' => null,
    ]);

    $this->actingAs($user)
        ->put(route('rewards.update', $reward), [
            'name' => $reward->name,
            'cost_in_money' => $reward->cost_in_money,
            'color' => $reward->color,
            'shop_url' => 'https://shop.example.com/item',
            'description' => 'Updated description',
        ])
        ->assertRedirect(route('rewards.index'));

    $reward->refresh();
    expect($reward->shop_url)->toBe('https://shop.example.com/item');
    expect($reward->description)->toBe('Updated description');
});
