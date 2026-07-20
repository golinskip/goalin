<?php

namespace Domain\Tools\GoalTracker\Concerns;

use Domain\Automation\EventRegistry;
use Domain\Tools\GoalTracker\Enums\ActivityType;
use Illuminate\Validation\Rule;

trait ActivityValidationRules
{
    /**
     * Shared activity rules, including the parameter rules of whichever event
     * an automated activity is bound to.
     *
     * @return array<string, array<mixed>>
     */
    protected function activityRules(): array
    {
        $registry = app(EventRegistry::class);

        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:1000'],
            'type' => ['nullable', Rule::enum(ActivityType::class)],
            'event_key' => ['nullable', 'required_if:type,'.ActivityType::Automated->value, Rule::in($registry->keys())],
            'event_parameters' => ['nullable', 'array'],
            'point_cost' => ['required', 'integer', 'min:1', 'max:999999'],
            'color' => ['required', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'needs_timer' => ['boolean'],
            'duration_minutes' => ['nullable', 'required_if:needs_timer,true', 'integer', 'min:1', 'max:1440'],
            'tags' => ['nullable', 'array'],
            'tags.*' => ['string', 'max:50'],
            'goal_ids' => ['nullable', 'array'],
            'goal_ids.*' => ['integer', 'exists:goals,id'],
        ];

        $eventKey = $this->input('event_key');

        if ($this->input('type') === ActivityType::Automated->value && is_string($eventKey) && $registry->has($eventKey)) {
            $rules = array_merge($rules, $registry->find($eventKey)->parameterRules());
        }

        return $rules;
    }
}
