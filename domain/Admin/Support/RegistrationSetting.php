<?php

namespace Domain\Admin\Support;

use Domain\Admin\Models\AppSetting;

class RegistrationSetting
{
    private const KEY = 'registration_enabled';

    public static function isEnabled(): bool
    {
        return AppSetting::getValue(self::KEY, '0') === '1';
    }

    public static function setEnabled(bool $enabled): void
    {
        AppSetting::setValue(self::KEY, $enabled ? '1' : '0');
    }
}
