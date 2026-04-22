<?php

namespace Domain\ExternalServices\Enums;

enum ServiceType: string
{
    case Todoist = 'todoist';
    case GoogleCalendar = 'google_calendar';

    public function label(): string
    {
        return match ($this) {
            self::Todoist => 'Todoist',
            self::GoogleCalendar => 'Google Calendar',
        };
    }

    public function externalUrl(): string
    {
        return match ($this) {
            self::Todoist => 'https://app.todoist.com/app/today',
            self::GoogleCalendar => 'https://calendar.google.com/calendar/r',
        };
    }
}
