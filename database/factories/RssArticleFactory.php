<?php

namespace Database\Factories;

use Domain\Tools\RssFeeds\Models\RssArticle;
use Domain\Tools\RssFeeds\Models\RssFeed;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<RssArticle>
 */
class RssArticleFactory extends Factory
{
    protected $model = RssArticle::class;

    public function definition(): array
    {
        return [
            'rss_feed_id' => RssFeed::factory(),
            'title' => fake()->sentence(),
            'link' => fake()->url(),
            'description' => fake()->paragraph(),
            'author' => fake()->name(),
            'guid' => fake()->unique()->uuid(),
            'published_at' => fake()->dateTimeBetween('-30 days', 'now'),
        ];
    }
}
