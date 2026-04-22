<?php

namespace Domain\User\Enums;

enum Ringtone: string
{
    case Classic = 'classic';
    case Chime = 'chime';
    case Digital = 'digital';
    case Bell = 'bell';
    case Zen = 'zen';

    public function label(): string
    {
        return match ($this) {
            self::Classic => 'Classic',
            self::Chime => 'Chime',
            self::Digital => 'Digital',
            self::Bell => 'Bell',
            self::Zen => 'Zen',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Classic => 'Quick alternating beeps',
            self::Chime => 'Gentle arpeggio cascade',
            self::Digital => 'Crisp double beep',
            self::Bell => 'Warm bell strike with decay',
            self::Zen => 'Slow meditative tone',
        };
    }
}
