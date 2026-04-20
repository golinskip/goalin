import { Head, router, useForm } from '@inertiajs/react';
import { CalendarDays, Check, ChevronDown, Circle, ExternalLink, Loader2, Plus, RefreshCw, Rss, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

type Feed = {
    id: number;
    name: string;
    feed_url: string;
    site_url: string | null;
    description: string | null;
    color: string;
    articles_count: number;
    last_fetched_at: string | null;
};

type Article = {
    id: number;
    title: string;
    link: string;
    description: string | null;
    author: string | null;
    published_at: string | null;
    read_at: string | null;
    feed_name: string;
    feed_color: string;
};

type DateFilters = {
    today: boolean;
    date_from: string;
    date_to: string | null;
};

type Props = {
    feeds: Feed[];
    articles: Article[];
    currentFeedId: number | null;
    filters: DateFilters;
};

const breadcrumbs: BreadcrumbItem[] = [{ title: 'RSS Feeds', href: '/rss-feeds' }];

const FEED_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];

export default function RssFeeds({ feeds, articles, currentFeedId, filters }: Props) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [refreshingFeedId, setRefreshingFeedId] = useState<number | null>(null);
    const [refreshingAll, setRefreshingAll] = useState(false);

    const selectedFeed = currentFeedId ? feeds.find((f) => f.id === currentFeedId) ?? null : null;

    const addForm = useForm<{ feed_url: string; name: string; color: string }>({
        feed_url: '',
        name: '',
        color: FEED_COLORS[feeds.length % FEED_COLORS.length],
    });

    const handleAddFeed = () => {
        addForm.post('/rss-feeds', {
            onSuccess: () => {
                setShowAddForm(false);
                addForm.reset();
            },
        });
    };

    const handleDeleteFeed = (feedId: number) => {
        if (!confirm('Remove this feed and all its articles?')) return;
        router.delete(`/rss-feeds/${feedId}`);
    };

    const handleRefreshFeed = (feedId: number) => {
        setRefreshingFeedId(feedId);
        router.post(`/rss-feeds/${feedId}/refresh`, {}, {
            onFinish: () => setRefreshingFeedId(null),
        });
    };

    const handleRefreshAll = () => {
        setRefreshingAll(true);
        router.post('/rss-feeds/refresh-all', {}, {
            onFinish: () => setRefreshingAll(false),
        });
    };

    const buildQuery = (overrides: Record<string, string | number | boolean | null> = {}) => {
        const params: Record<string, string | number | boolean> = {};
        const merged = {
            feed: currentFeedId,
            today: filters.today || false,
            date_from: filters.date_from,
            date_to: filters.date_to,
            ...overrides,
        };

        if (merged.feed) params.feed = merged.feed as number;
        if (merged.today) {
            params.today = 1;
        } else {
            if (merged.date_from) params.date_from = merged.date_from as string;
            if (merged.date_to) params.date_to = merged.date_to as string;
        }

        return params;
    };

    const navigate = (overrides: Record<string, string | number | boolean | null> = {}) => {
        router.get('/rss-feeds', buildQuery(overrides), {
            preserveState: true,
            preserveScroll: false,
        });
    };

    const handleFilterFeed = (feedId: number | null) => {
        navigate({ feed: feedId });
    };

    const handleTodayToggle = () => {
        if (filters.today) {
            navigate({ today: false });
        } else {
            navigate({ today: true, date_from: null, date_to: null });
        }
    };

    const handleDateFromChange = (value: string) => {
        navigate({ date_from: value || null, today: false });
    };

    const handleDateToChange = (value: string) => {
        navigate({ date_to: value || null, today: false });
    };

    const handleToggleRead = (e: React.MouseEvent, articleId: number) => {
        e.preventDefault();
        e.stopPropagation();
        router.post(`/rss-articles/${articleId}/toggle-read`, {}, {
            preserveScroll: true,
        });
    };

    const handleArticleOpen = (article: Article) => {
        if (article.read_at) {
            return;
        }
        router.post(`/rss-articles/${article.id}/mark-read`, {}, {
            preserveScroll: true,
            preserveState: true,
        });
    };

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffHours < 48) return 'Yesterday';

        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="RSS Feeds" />

            <div className="mx-auto w-full max-w-5xl p-4 lg:p-6">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Rss className="size-6 text-orange-500" />
                        <h1 className="text-2xl font-bold">RSS Feeds</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {feeds.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={refreshingAll}>
                                <RefreshCw className={`mr-1.5 size-4 ${refreshingAll ? 'animate-spin' : ''}`} />
                                Refresh All
                            </Button>
                        )}
                        <Button size="sm" onClick={() => setShowAddForm(true)}>
                            <Plus className="mr-1.5 size-4" />
                            Add Feed
                        </Button>
                    </div>
                </div>

                {/* Add Feed Form */}
                {showAddForm && (
                    <div className="mb-6 rounded-lg border bg-card p-4">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-semibold">Subscribe to a Feed</h3>
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => setShowAddForm(false)}>
                                <X className="size-4" />
                            </Button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <Label htmlFor="feed_url">Feed URL</Label>
                                <Input
                                    id="feed_url"
                                    placeholder="https://example.com/feed.xml"
                                    value={addForm.data.feed_url}
                                    onChange={(e) => addForm.setData('feed_url', e.target.value)}
                                />
                                {addForm.errors.feed_url && <p className="mt-1 text-sm text-destructive">{addForm.errors.feed_url}</p>}
                            </div>
                            <div className="flex gap-3">
                                <div className="flex-1">
                                    <Label htmlFor="feed_name">Name (optional, auto-detected)</Label>
                                    <Input
                                        id="feed_name"
                                        placeholder="My Feed"
                                        value={addForm.data.name}
                                        onChange={(e) => addForm.setData('name', e.target.value)}
                                    />
                                </div>
                                <div className="w-24">
                                    <Label htmlFor="feed_color">Color</Label>
                                    <Input
                                        id="feed_color"
                                        type="color"
                                        value={addForm.data.color}
                                        onChange={(e) => addForm.setData('color', e.target.value)}
                                        className="h-9 cursor-pointer p-1"
                                    />
                                </div>
                            </div>
                            <Button onClick={handleAddFeed} disabled={addForm.processing} className="w-full">
                                {addForm.processing ? (
                                    <>
                                        <Loader2 className="mr-2 size-4 animate-spin" />
                                        Fetching feed...
                                    </>
                                ) : (
                                    'Subscribe'
                                )}
                            </Button>
                        </div>
                    </div>
                )}

                {/* Feed Filter Dropdown */}
                {feeds.length > 0 && (
                    <div className="mb-4 flex items-center gap-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                    {selectedFeed ? (
                                        <>
                                            <span className="size-2.5 rounded-full" style={{ backgroundColor: selectedFeed.color }} />
                                            {selectedFeed.name}
                                        </>
                                    ) : (
                                        <>
                                            <Rss className="size-3.5" />
                                            All Feeds
                                        </>
                                    )}
                                    <ChevronDown className="size-3.5 opacity-50" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-56">
                                <DropdownMenuItem
                                    onClick={() => handleFilterFeed(null)}
                                    className="gap-2"
                                >
                                    <Rss className="size-3.5 text-muted-foreground" />
                                    All Feeds
                                    <span className="ml-auto text-xs text-muted-foreground">
                                        {feeds.reduce((sum, f) => sum + f.articles_count, 0)}
                                    </span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {feeds.map((feed) => (
                                    <DropdownMenuItem
                                        key={feed.id}
                                        onClick={() => handleFilterFeed(feed.id)}
                                        className="gap-2"
                                    >
                                        <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: feed.color }} />
                                        <span className="truncate">{feed.name}</span>
                                        <span className="ml-auto text-xs text-muted-foreground">{feed.articles_count}</span>
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {selectedFeed && (
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7"
                                    onClick={() => handleRefreshFeed(selectedFeed.id)}
                                    disabled={refreshingFeedId === selectedFeed.id}
                                    title="Refresh feed"
                                >
                                    <RefreshCw className={`size-3.5 ${refreshingFeedId === selectedFeed.id ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteFeed(selectedFeed.id)}
                                    title="Remove feed"
                                >
                                    <Trash2 className="size-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                {/* Date Filters */}
                {feeds.length > 0 && (
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        <button
                            onClick={handleTodayToggle}
                            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
                                filters.today
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                        >
                            Today
                        </button>
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="date"
                                value={filters.today ? '' : filters.date_from}
                                onChange={(e) => handleDateFromChange(e.target.value)}
                                className="h-7 w-auto text-xs"
                                disabled={filters.today}
                            />
                            <span className="text-xs text-muted-foreground">to</span>
                            <Input
                                type="date"
                                value={filters.date_to ?? ''}
                                onChange={(e) => handleDateToChange(e.target.value)}
                                className="h-7 w-auto text-xs"
                                disabled={filters.today}
                            />
                        </div>
                    </div>
                )}

                {/* Articles List */}
                {feeds.length === 0 && !showAddForm ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                        <Rss className="mb-3 size-10 text-muted-foreground/50" />
                        <p className="text-lg font-medium">No feeds yet</p>
                        <p className="mb-4 text-sm text-muted-foreground">Subscribe to RSS feeds to start reading articles here.</p>
                        <Button onClick={() => setShowAddForm(true)}>
                            <Plus className="mr-1.5 size-4" />
                            Add Your First Feed
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {articles.map((article) => (
                            <div key={article.id} className="group relative flex items-start gap-3">
                                <button
                                    onClick={(e) => handleToggleRead(e, article.id)}
                                    className="mt-4 shrink-0 p-0.5"
                                    title={article.read_at ? 'Mark as unread' : 'Mark as read'}
                                >
                                    {article.read_at ? (
                                        <Check className="size-4 text-green-500" />
                                    ) : (
                                        <Circle className="size-4 fill-orange-400 text-orange-400" />
                                    )}
                                </button>
                                <a
                                    href={article.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleArticleOpen(article)}
                                    onAuxClick={(e) => {
                                        if (e.button === 1) {
                                            handleArticleOpen(article);
                                        }
                                    }}
                                    className={`block flex-1 rounded-lg border p-4 transition-colors hover:bg-accent/50 ${
                                        article.read_at ? 'bg-muted/30 opacity-60' : 'bg-card'
                                    }`}
                                >
                                    <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                                        <span className="size-2 rounded-full" style={{ backgroundColor: article.feed_color }} />
                                        <span>{article.feed_name}</span>
                                        {article.author && (
                                            <>
                                                <span className="text-muted-foreground/40">·</span>
                                                <span>{article.author}</span>
                                            </>
                                        )}
                                        {article.published_at && (
                                            <>
                                                <span className="text-muted-foreground/40">·</span>
                                                <span>{formatDate(article.published_at)}</span>
                                            </>
                                        )}
                                        <ExternalLink className="ml-auto size-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </div>
                                    <h3 className={`leading-snug ${article.read_at ? 'font-medium' : 'font-semibold'}`}>{article.title}</h3>
                                    {article.description && (
                                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{article.description}</p>
                                    )}
                                </a>
                            </div>
                        ))}

                        {articles.length === 0 && feeds.length > 0 && (
                            <div className="py-12 text-center">
                                <p className="text-muted-foreground">No articles in this date range. Try changing the date filter or refreshing your feeds.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
