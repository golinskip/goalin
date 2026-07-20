<?php

namespace Domain\Automation;

class EventRegistry
{
    /** @var array<string, AutomationEvent> */
    private array $events = [];

    public function __construct(AutomationEvent ...$events)
    {
        foreach ($events as $event) {
            $this->events[$event->key()] = $event;
        }
    }

    public function find(string $key): ?AutomationEvent
    {
        return $this->events[$key] ?? null;
    }

    public function has(string $key): bool
    {
        return isset($this->events[$key]);
    }

    /**
     * @return list<AutomationEvent>
     */
    public function all(): array
    {
        return array_values($this->events);
    }

    /**
     * @return list<string>
     */
    public function keys(): array
    {
        return array_keys($this->events);
    }

    /**
     * Event definitions for the activity form, grouped in registration order.
     *
     * @return list<array<string, mixed>>
     */
    public function toArray(): array
    {
        return array_map(
            fn (AutomationEvent $event): array => $event->toArray(),
            $this->all(),
        );
    }
}
