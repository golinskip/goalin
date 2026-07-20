<?php

namespace Domain\Automation;

use Domain\User\Models\User;

abstract class AutomationEvent
{
    abstract public function key(): string;

    abstract public function tool(): string;

    abstract public function label(): string;

    abstract public function description(): string;

    /**
     * Parameter definitions the user fills in when binding an activity to this
     * event. Each entry drives both the activity form and the stored payload.
     *
     * @return list<EventParameter>
     */
    abstract public function parameters(): array;

    /**
     * Decide how many times the bound activity has been earned right now.
     *
     * Returning 0 means nothing is awarded. Any value above 0 is multiplied by
     * the activity's point cost, so an event may award several units at once.
     *
     * @param  array<string, mixed>  $parameters  values captured from parameters()
     */
    abstract public function evaluate(User $user, array $parameters): int;

    /**
     * Whether an activity bound to this event may be earned more than once on
     * the same day. Events that count a running total override this.
     */
    public function isRepeatableWithinDay(): bool
    {
        return false;
    }

    /**
     * @return array{
     *     key: string,
     *     tool: string,
     *     label: string,
     *     description: string,
     *     repeatable_within_day: bool,
     *     parameters: list<array{name: string, label: string, type: string, default: mixed, min: int|null, max: int|null, options: list<array{value: string, label: string}>|null, help: string|null}>,
     * }
     */
    public function toArray(): array
    {
        return [
            'key' => $this->key(),
            'tool' => $this->tool(),
            'label' => $this->label(),
            'description' => $this->description(),
            'repeatable_within_day' => $this->isRepeatableWithinDay(),
            'parameters' => array_map(
                fn (EventParameter $parameter): array => $parameter->toArray(),
                $this->parameters(),
            ),
        ];
    }

    /**
     * Validation rules for this event's stored parameters, keyed by the payload
     * path the activity form submits.
     *
     * @return array<string, list<mixed>>
     */
    public function parameterRules(): array
    {
        $rules = [];

        foreach ($this->parameters() as $parameter) {
            $rules['event_parameters.'.$parameter->name] = $parameter->rules();
        }

        return $rules;
    }

    /**
     * Drop anything the event did not declare and fall back to declared
     * defaults, so stored payloads always match the current definition.
     *
     * @param  array<string, mixed>  $parameters
     * @return array<string, mixed>
     */
    public function normalizeParameters(array $parameters): array
    {
        $normalized = [];

        foreach ($this->parameters() as $parameter) {
            $normalized[$parameter->name] = $parameter->cast(
                $parameters[$parameter->name] ?? $parameter->default,
            );
        }

        return $normalized;
    }
}
