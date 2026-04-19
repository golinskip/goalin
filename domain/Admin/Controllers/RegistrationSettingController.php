<?php

namespace Domain\Admin\Controllers;

use App\Http\Controllers\Controller;
use Domain\Admin\Support\RegistrationSetting;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class RegistrationSettingController extends Controller
{
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'enabled' => ['required', 'boolean'],
        ]);

        RegistrationSetting::setEnabled((bool) $validated['enabled']);

        return back();
    }
}
