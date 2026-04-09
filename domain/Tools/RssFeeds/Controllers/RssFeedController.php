<?php

namespace Domain\Tools\RssFeeds\Controllers;

use App\Http\Controllers\Controller;
use Domain\Tools\RssFeeds\Models\RssArticle;
use Domain\Tools\RssFeeds\Models\RssFeed;
use Domain\Tools\RssFeeds\Requests\StoreRssFeedRequest;
use Domain\Tools\RssFeeds\Requests\UpdateRssFeedRequest;
use Domain\Tools\RssFeeds\Services\FeedParserService;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class RssFeedController extends Controller
{
    use AuthorizesRequests;

    public function index(Request $request): Response
    {
        $user = $request->user();
        $feedId = $request->integer('feed');
        $dateFrom = $request->string('date_from')->toString() ?: today()->subDays(7)->format('Y-m-d');
        $dateTo = $request->string('date_to')->toString() ?: null;
        $todayOnly = $request->boolean('today');

        $feeds = $user->rssFeeds()
            ->withCount(['articles' => function ($query) use ($todayOnly, $dateFrom, $dateTo): void {
                if ($todayOnly) {
                    $query->whereDate('published_at', today());
                } else {
                    $query->whereDate('published_at', '>=', $dateFrom);
                    if ($dateTo) {
                        $query->whereDate('published_at', '<=', $dateTo);
                    }
                }
            }])
            ->orderBy('name')
            ->get();

        $articlesQuery = $user->rssFeeds()
            ->join('rss_articles', 'rss_feeds.id', '=', 'rss_articles.rss_feed_id')
            ->select('rss_articles.*', 'rss_feeds.name as feed_name', 'rss_feeds.color as feed_color')
            ->orderByDesc('rss_articles.published_at')
            ->orderByDesc('rss_articles.created_at');

        if ($feedId) {
            $articlesQuery->where('rss_feeds.id', $feedId);
        }

        if ($todayOnly) {
            $articlesQuery->whereDate('rss_articles.published_at', today());
        } else {
            $articlesQuery->whereDate('rss_articles.published_at', '>=', $dateFrom);
            if ($dateTo) {
                $articlesQuery->whereDate('rss_articles.published_at', '<=', $dateTo);
            }
        }

        $articles = $articlesQuery->get();

        return Inertia::render('tools/rss-feeds/index', [
            'feeds' => $feeds->map(fn (RssFeed $feed) => [
                'id' => $feed->id,
                'name' => $feed->name,
                'feed_url' => $feed->feed_url,
                'site_url' => $feed->site_url,
                'description' => $feed->description,
                'color' => $feed->color,
                'articles_count' => $feed->articles_count,
                'last_fetched_at' => $feed->last_fetched_at?->diffForHumans(),
            ]),
            'articles' => $articles,
            'currentFeedId' => $feedId ?: null,
            'filters' => [
                'today' => $todayOnly,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
        ]);
    }

    public function store(StoreRssFeedRequest $request, FeedParserService $parser): RedirectResponse
    {
        $feedUrl = $request->validated('feed_url');

        try {
            $parsed = $parser->parse($feedUrl);
        } catch (\Exception $e) {
            return back()->withErrors(['feed_url' => 'Could not fetch or parse the feed. Please check the URL.']);
        }

        $feed = $request->user()->rssFeeds()->create([
            'name' => $request->validated('name') ?: $parsed['name'],
            'feed_url' => $feedUrl,
            'site_url' => $parsed['site_url'],
            'description' => $parsed['description'],
            'color' => $request->validated('color') ?? '#6366f1',
        ]);

        $parser->syncFeed($feed);

        return to_route('rss-feeds.index');
    }

    public function update(UpdateRssFeedRequest $request, RssFeed $rssFeed): RedirectResponse
    {
        $this->authorize('update', $rssFeed);

        $rssFeed->update($request->validated());

        return to_route('rss-feeds.index');
    }

    public function destroy(RssFeed $rssFeed): RedirectResponse
    {
        $this->authorize('delete', $rssFeed);

        $rssFeed->delete();

        return to_route('rss-feeds.index');
    }

    public function refresh(RssFeed $rssFeed, FeedParserService $parser): RedirectResponse
    {
        $this->authorize('update', $rssFeed);

        try {
            $parser->syncFeed($rssFeed);
        } catch (\Exception $e) {
            return back()->withErrors(['feed' => 'Failed to refresh feed: '.$e->getMessage()]);
        }

        return to_route('rss-feeds.index', ['feed' => $rssFeed->id]);
    }

    public function refreshAll(Request $request, FeedParserService $parser): RedirectResponse
    {
        $feeds = $request->user()->rssFeeds()->get();

        foreach ($feeds as $feed) {
            try {
                $parser->syncFeed($feed);
            } catch (\Exception $e) {
                // Skip failed feeds silently
            }
        }

        return to_route('rss-feeds.index');
    }

    public function toggleRead(Request $request, RssArticle $rssArticle): RedirectResponse
    {
        $feed = $rssArticle->feed;

        abort_unless($feed->user_id === $request->user()->id, 403);

        $rssArticle->update([
            'read_at' => $rssArticle->read_at ? null : now(),
        ]);

        return back();
    }
}
