<?php

namespace Domain\Admin\Controllers;

use App\Http\Controllers\Controller;
use Domain\Admin\Support\RegistrationSetting;
use Domain\User\Models\User;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    public function __invoke(): Response
    {
        $users = User::query()
            ->orderBy('id')
            ->get(['id', 'name', 'email', 'is_super_admin', 'locked_at', 'created_at'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->isSuperAdmin(),
                'is_locked' => $user->isLocked(),
                'locked_at' => $user->locked_at?->toIso8601String(),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/index', [
            'users' => $users,
            'registrationEnabled' => RegistrationSetting::isEnabled(),
        ]);
    }
}
