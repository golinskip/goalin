<?php

namespace App\Enums;

enum Currency: string
{
    case Euro = 'EUR';
    case Dollar = 'USD';
    case Pln = 'PLN';

    public function symbol(): string
    {
        return match ($this) {
            self::Euro => '€',
            self::Dollar => '$',
            self::Pln => 'zł',
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Euro => 'Euro (€)',
            self::Dollar => 'Dollar ($)',
            self::Pln => 'PLN (zł)',
        };
    }
}
