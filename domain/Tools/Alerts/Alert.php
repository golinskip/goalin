<?php

namespace Domain\Tools\Alerts;

use Domain\User\Models\User;

abstract class Alert
{
    abstract public function key(): string;

    abstract public function tool(): string;

    abstract public function message(): string;

    abstract public function href(): string;

    abstract public function check(User $user): bool;

    /**
     * @return array{key: string, tool: string, message: string, href: string}
     */
    public function toArray(): array
    {
        return [
            'key' => $this->key(),
            'tool' => $this->tool(),
            'message' => $this->message(),
            'href' => $this->href(),
        ];
    }
}
