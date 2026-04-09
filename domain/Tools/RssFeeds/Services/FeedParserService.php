<?php

namespace Domain\Tools\RssFeeds\Services;

use Domain\Tools\RssFeeds\Models\RssFeed;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

class FeedParserService
{
    /**
     * Fetch and parse a feed URL, returning structured metadata and items.
     *
     * @return array{name: string, site_url: string|null, description: string|null, items: array<int, array{title: string, link: string, description: string|null, author: string|null, guid: string|null, published_at: string|null}>}
     */
    public function parse(string $feedUrl): array
    {
        $response = Http::timeout(15)
            ->withHeaders(['User-Agent' => 'Goalin RSS Reader/1.0'])
            ->get($feedUrl);

        $response->throw();

        $xml = simplexml_load_string($response->body(), 'SimpleXMLElement', LIBXML_NOCDATA);

        if ($xml === false) {
            throw new \RuntimeException('Failed to parse feed XML.');
        }

        if (isset($xml->channel)) {
            return $this->parseRss2($xml);
        }

        if ($xml->getName() === 'feed') {
            return $this->parseAtom($xml);
        }

        if (isset($xml->channel) || isset($xml->item)) {
            return $this->parseRss1($xml);
        }

        throw new \RuntimeException('Unsupported feed format.');
    }

    /**
     * Sync articles from a feed URL into the database.
     */
    public function syncFeed(RssFeed $feed): int
    {
        $parsed = $this->parse($feed->feed_url);
        $imported = 0;

        foreach ($parsed['items'] as $item) {
            $guid = $item['guid'] ?? $item['link'];

            $wasRecentlyCreated = $feed->articles()->updateOrCreate(
                ['guid' => $guid],
                [
                    'title' => mb_substr($item['title'], 0, 255),
                    'link' => $item['link'],
                    'description' => $item['description'],
                    'author' => $item['author'] ? mb_substr($item['author'], 0, 255) : null,
                    'published_at' => $item['published_at'],
                ],
            )->wasRecentlyCreated;

            if ($wasRecentlyCreated) {
                $imported++;
            }
        }

        $feed->update(['last_fetched_at' => now()]);

        return $imported;
    }

    private function parseRss2(\SimpleXMLElement $xml): array
    {
        $channel = $xml->channel;

        $items = [];
        foreach ($channel->item as $entry) {
            $items[] = [
                'title' => (string) $entry->title,
                'link' => (string) $entry->link,
                'description' => $this->cleanHtml((string) $entry->description),
                'author' => (string) ($entry->author ?: $entry->children('dc', true)->creator ?? ''),
                'guid' => (string) ($entry->guid ?: $entry->link),
                'published_at' => $this->parseDate((string) $entry->pubDate),
            ];
        }

        return [
            'name' => (string) $channel->title,
            'site_url' => (string) $channel->link ?: null,
            'description' => (string) $channel->description ?: null,
            'items' => $items,
        ];
    }

    private function parseAtom(\SimpleXMLElement $xml): array
    {
        $ns = $xml->getNamespaces(true);
        $siteUrl = null;

        foreach ($xml->link as $link) {
            $rel = (string) $link['rel'];
            if ($rel === 'alternate' || $rel === '') {
                $siteUrl = (string) $link['href'];
                break;
            }
        }

        $items = [];
        foreach ($xml->entry as $entry) {
            $entryLink = '';
            foreach ($entry->link as $link) {
                $rel = (string) $link['rel'];
                if ($rel === 'alternate' || $rel === '') {
                    $entryLink = (string) $link['href'];
                    break;
                }
            }

            $items[] = [
                'title' => (string) $entry->title,
                'link' => $entryLink,
                'description' => $this->cleanHtml((string) ($entry->summary ?: $entry->content)),
                'author' => (string) ($entry->author->name ?? ''),
                'guid' => (string) ($entry->id ?: $entryLink),
                'published_at' => $this->parseDate((string) ($entry->published ?: $entry->updated)),
            ];
        }

        return [
            'name' => (string) $xml->title,
            'site_url' => $siteUrl,
            'description' => (string) ($xml->subtitle ?? '') ?: null,
            'items' => $items,
        ];
    }

    private function parseRss1(\SimpleXMLElement $xml): array
    {
        $channel = $xml->channel;

        $items = [];
        foreach ($xml->item as $entry) {
            $dc = $entry->children('dc', true);

            $items[] = [
                'title' => (string) $entry->title,
                'link' => (string) $entry->link,
                'description' => $this->cleanHtml((string) $entry->description),
                'author' => (string) ($dc->creator ?? ''),
                'guid' => (string) $entry->link,
                'published_at' => $this->parseDate((string) ($dc->date ?? '')),
            ];
        }

        return [
            'name' => (string) $channel->title,
            'site_url' => (string) $channel->link ?: null,
            'description' => (string) $channel->description ?: null,
            'items' => $items,
        ];
    }

    private function cleanHtml(string $html): ?string
    {
        if ($html === '') {
            return null;
        }

        $text = strip_tags($html);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/', ' ', $text);

        return trim($text) ?: null;
    }

    private function parseDate(string $dateString): ?string
    {
        if ($dateString === '') {
            return null;
        }

        try {
            return Carbon::parse($dateString)->toDateTimeString();
        } catch (\Exception) {
            return null;
        }
    }
}
