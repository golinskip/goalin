<?php

namespace Domain\Alerts;

use Domain\User\Models\User;

class AlertManager
{
    /** @var list<Alert> */
    private array $alerts;

    public function __construct(Alert ...$alerts)
    {
        $this->alerts = $alerts;
    }

    /**
     * @return list<array{key: string, tool: string, message: string, href: string}>
     */
    public function getActiveAlerts(User $user): array
    {
        $active = [];

        foreach ($this->alerts as $alert) {
            if ($alert->check($user)) {
                $active[] = $alert->toArray();
            }
        }

        return $active;
    }
}
