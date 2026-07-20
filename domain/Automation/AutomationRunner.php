<?php

namespace Domain\Automation;

use Domain\Tools\GoalTracker\Enums\ActivityType;
use Domain\Tools\GoalTracker\Models\Activity;
use Domain\Tools\GoalTracker\Models\ActivityLog;
use Domain\User\Models\User;
use Illuminate\Support\Facades\Date;

class AutomationRunner
{
    public function __construct(private readonly EventRegistry $registry) {}

    /**
     * Run every automated activity the user has bound to this event key and
     * award the ones whose conditions are now met.
     *
     * @return list<ActivityLog>
     */
    public function fire(string $eventKey, User $user): array
    {
        $event = $this->registry->find($eventKey);

        if ($event === null) {
            return [];
        }

        $activities = $user->activities()
            ->withoutGlobalScope('ordered')
            ->where('type', ActivityType::Automated)
            ->where('event_key', $eventKey)
            ->get();

        $logs = [];

        foreach ($activities as $activity) {
            $log = $this->run($event, $activity, $user);

            if ($log !== null) {
                $logs[] = $log;
            }
        }

        return $logs;
    }

    private function run(AutomationEvent $event, Activity $activity, User $user): ?ActivityLog
    {
        $today = Date::today();
        $alreadyEarnedToday = (int) $activity->logs()
            ->whereDate('completed_at', $today)
            ->sum('quantity');

        if ($alreadyEarnedToday > 0 && ! $event->isRepeatableWithinDay()) {
            return null;
        }

        $earned = $event->evaluate($user, $event->normalizeParameters($activity->event_parameters ?? []));

        if ($earned <= 0) {
            return null;
        }

        /**
         * Repeatable events report the running total for the day, so subtract
         * what was already awarded rather than paying for the same units twice.
         */
        $quantity = $event->isRepeatableWithinDay()
            ? $earned - $alreadyEarnedToday
            : $earned;

        if ($quantity <= 0) {
            return null;
        }

        return $user->activityLogs()->create([
            'activity_id' => $activity->id,
            'completed_at' => $today,
            'quantity' => $quantity,
            'points_earned' => $activity->point_cost * $quantity,
            'used_timer' => false,
        ]);
    }
}
