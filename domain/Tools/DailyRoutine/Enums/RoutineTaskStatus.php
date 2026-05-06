<?php

namespace Domain\Tools\DailyRoutine\Enums;

enum RoutineTaskStatus: string
{
    case Done = 'done';
    case Skipped = 'skipped';
    case Missed = 'missed';
}
