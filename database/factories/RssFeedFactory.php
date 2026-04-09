<?php

namespace Database\Factories;

use Domain\Tools\RssFeeds\Models\RssFeed;
use Domain\User\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RssFeed>
 */
class RssFeedFactory extends Factory
{
    protected $model = RssFeed::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->company().' Blog',
            'feed_url' => fake()->url().'/feed',
            'site_url' => fake()->url(),
            'description' => fake()->sentence(),
            'color' => fake()->hexColor(),
        ];
    }
}
