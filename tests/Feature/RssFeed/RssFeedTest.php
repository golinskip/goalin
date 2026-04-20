<?php

use Domain\Tools\RssFeeds\Models\RssArticle;
use Domain\Tools\RssFeeds\Models\RssFeed;
use Domain\Tools\RssFeeds\Services\FeedParserService;
use Domain\User\Models\User;

test('guests cannot access rss feeds', function () {
    $this->get(route('rss-feeds.index'))->assertRedirect(route('home'));
});

test('users can view rss feeds index', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('rss-feeds.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/rss-feeds/index')
        ->has('feeds')
        ->has('articles')
    );
});

test('users can see their feeds and articles', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    RssArticle::factory()->for($feed, 'feed')->count(3)->create(['published_at' => now()]);
    $this->actingAs($user);

    $response = $this->get(route('rss-feeds.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->component('tools/rss-feeds/index')
        ->has('feeds', 1)
        ->has('articles', 3)
    );
});

test('users can filter articles by feed', function () {
    $user = User::factory()->create();
    $feed1 = RssFeed::factory()->for($user)->create();
    $feed2 = RssFeed::factory()->for($user)->create();
    RssArticle::factory()->for($feed1, 'feed')->count(2)->create(['published_at' => now()]);
    RssArticle::factory()->for($feed2, 'feed')->count(3)->create(['published_at' => now()]);
    $this->actingAs($user);

    $response = $this->get(route('rss-feeds.index', ['feed' => $feed1->id]));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->has('articles', 2)
        ->where('currentFeedId', $feed1->id)
    );
});

test('users can filter articles by today only', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    RssArticle::factory()->for($feed, 'feed')->create(['published_at' => now()]);
    RssArticle::factory()->for($feed, 'feed')->create(['published_at' => now()->subDays(3)]);
    RssArticle::factory()->for($feed, 'feed')->create(['published_at' => now()->subWeek()]);
    $this->actingAs($user);

    $response = $this->get(route('rss-feeds.index', ['today' => 1]));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->has('articles', 1)
        ->where('filters.today', true)
    );
});

test('users can filter articles by date range', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    RssArticle::factory()->for($feed, 'feed')->create(['published_at' => now()->subDays(2)]);
    RssArticle::factory()->for($feed, 'feed')->create(['published_at' => now()->subDays(5)]);
    RssArticle::factory()->for($feed, 'feed')->create(['published_at' => now()->subDays(10)]);
    $this->actingAs($user);

    $response = $this->get(route('rss-feeds.index', [
        'date_from' => now()->subDays(6)->format('Y-m-d'),
        'date_to' => now()->subDay()->format('Y-m-d'),
    ]));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->has('articles', 2)
        ->where('filters.date_from', now()->subDays(6)->format('Y-m-d'))
        ->where('filters.date_to', now()->subDay()->format('Y-m-d'))
    );
});

test('default date_from is 7 days ago when not specified', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    RssArticle::factory()->for($feed, 'feed')->create(['published_at' => now()->subDays(3)]);
    RssArticle::factory()->for($feed, 'feed')->create(['published_at' => now()->subDays(10)]);
    $this->actingAs($user);

    $response = $this->get(route('rss-feeds.index'));

    $response->assertSuccessful();
    $response->assertInertia(fn ($page) => $page
        ->has('articles', 1)
        ->where('filters.date_from', today()->subDays(7)->format('Y-m-d'))
    );
});

test('users can subscribe to an rss feed', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $parser = mock(FeedParserService::class);
    $parser->shouldReceive('parse')->once()->andReturn([
        'name' => 'Test Blog',
        'site_url' => 'https://example.com',
        'description' => 'A test blog',
        'items' => [],
    ]);
    $parser->shouldReceive('syncFeed')->once()->andReturn(0);

    $response = $this->post(route('rss-feeds.store'), [
        'feed_url' => 'https://example.com/feed.xml',
        'color' => '#6366f1',
    ]);

    $response->assertRedirect(route('rss-feeds.index'));
    $this->assertDatabaseHas('rss_feeds', [
        'user_id' => $user->id,
        'name' => 'Test Blog',
        'feed_url' => 'https://example.com/feed.xml',
    ]);
});

test('feed subscription requires a valid url', function () {
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->post(route('rss-feeds.store'), [
        'feed_url' => 'not-a-url',
    ]);

    $response->assertSessionHasErrors('feed_url');
});

test('users cannot subscribe to the same feed twice', function () {
    $user = User::factory()->create();
    RssFeed::factory()->for($user)->create(['feed_url' => 'https://example.com/feed.xml']);
    $this->actingAs($user);

    $response = $this->post(route('rss-feeds.store'), [
        'feed_url' => 'https://example.com/feed.xml',
    ]);

    $response->assertSessionHasErrors('feed_url');
});

test('users can update their feed name', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    $this->actingAs($user);

    $response = $this->put(route('rss-feeds.update', $feed), [
        'name' => 'Updated Name',
        'color' => '#ec4899',
    ]);

    $response->assertRedirect(route('rss-feeds.index'));
    $this->assertDatabaseHas('rss_feeds', [
        'id' => $feed->id,
        'name' => 'Updated Name',
        'color' => '#ec4899',
    ]);
});

test('users cannot update another users feed', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $feed = RssFeed::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->put(route('rss-feeds.update', $feed), [
        'name' => 'Hacked',
    ]);

    $response->assertForbidden();
});

test('users can delete their feed', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    RssArticle::factory()->for($feed, 'feed')->count(3)->create();
    $this->actingAs($user);

    $response = $this->delete(route('rss-feeds.destroy', $feed));

    $response->assertRedirect(route('rss-feeds.index'));
    $this->assertDatabaseMissing('rss_feeds', ['id' => $feed->id]);
    $this->assertDatabaseCount('rss_articles', 0);
});

test('users cannot delete another users feed', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $feed = RssFeed::factory()->for($otherUser)->create();
    $this->actingAs($user);

    $response = $this->delete(route('rss-feeds.destroy', $feed));

    $response->assertForbidden();
});

test('users can refresh a feed', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    $this->actingAs($user);

    $parser = mock(FeedParserService::class);
    $parser->shouldReceive('syncFeed')->once()->with($feed)->andReturn(5);

    $response = $this->post(route('rss-feeds.refresh', $feed));

    $response->assertRedirect(route('rss-feeds.index', ['feed' => $feed->id]));
});

test('users cannot see other users feeds', function () {
    $otherUser = User::factory()->create();
    RssFeed::factory()->for($otherUser)->create();
    $user = User::factory()->create();
    $this->actingAs($user);

    $response = $this->get(route('rss-feeds.index'));

    $response->assertInertia(fn ($page) => $page->has('feeds', 0));
});

test('users can mark an article as read', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    $article = RssArticle::factory()->for($feed, 'feed')->create(['read_at' => null]);
    $this->actingAs($user);

    $response = $this->post(route('rss-articles.toggle-read', $article));

    $response->assertRedirect();
    $this->assertNotNull($article->fresh()->read_at);
});

test('users can mark a read article as unread', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    $article = RssArticle::factory()->for($feed, 'feed')->create(['read_at' => now()]);
    $this->actingAs($user);

    $response = $this->post(route('rss-articles.toggle-read', $article));

    $response->assertRedirect();
    $this->assertNull($article->fresh()->read_at);
});

test('users cannot toggle read on another users article', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $feed = RssFeed::factory()->for($otherUser)->create();
    $article = RssArticle::factory()->for($feed, 'feed')->create();
    $this->actingAs($user);

    $response = $this->post(route('rss-articles.toggle-read', $article));

    $response->assertForbidden();
});

test('opening an unread article marks it as read', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    $article = RssArticle::factory()->for($feed, 'feed')->create(['read_at' => null]);
    $this->actingAs($user);

    $response = $this->post(route('rss-articles.mark-read', $article));

    $response->assertRedirect();
    expect($article->fresh()->read_at)->not->toBeNull();
});

test('mark-read does not change an already-read article timestamp', function () {
    $user = User::factory()->create();
    $feed = RssFeed::factory()->for($user)->create();
    $readAt = now()->subHour();
    $article = RssArticle::factory()->for($feed, 'feed')->create(['read_at' => $readAt]);
    $this->actingAs($user);

    $this->post(route('rss-articles.mark-read', $article));

    expect($article->fresh()->read_at->timestamp)->toBe($readAt->timestamp);
});

test('users cannot mark-read another users article', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();
    $feed = RssFeed::factory()->for($otherUser)->create();
    $article = RssArticle::factory()->for($feed, 'feed')->create(['read_at' => null]);
    $this->actingAs($user);

    $response = $this->post(route('rss-articles.mark-read', $article));

    $response->assertForbidden();
    expect($article->fresh()->read_at)->toBeNull();
});
