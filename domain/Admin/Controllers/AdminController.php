<?php

namespace Domain\Admin\Controllers;

use App\Http\Controllers\Controller;
use Domain\Admin\Models\UserActivityLog;
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
            ->get(['id', 'name', 'email', 'is_super_admin', 'locked_at', 'created_at']);

        $recentLogsByUser = UserActivityLog::query()
            ->whereIn('user_id', $users->pluck('id'))
            ->orderByDesc('last_request_at')
            ->get()
            ->groupBy('user_id');

        $payload = $users->map(function (User $user) use ($recentLogsByUser) {
            $logs = $recentLogsByUser->get($user->id, collect());

            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'is_super_admin' => $user->isSuperAdmin(),
                'is_locked' => $user->isLocked(),
                'locked_at' => $user->locked_at?->toIso8601String(),
                'created_at' => $user->created_at?->toIso8601String(),
                'activity_summary' => [
                    'session_count' => $logs->count(),
                    'total_requests' => (int) $logs->sum('request_count'),
                    'last_request_at' => $logs->first()?->last_request_at?->toIso8601String(),
                    'last_ip' => $logs->first()?->ip_address,
                ],
                'sessions' => $logs->take(10)->map(fn (UserActivityLog $log) => [
                    'id' => $log->id,
                    'session_id' => $log->session_id,
                    'ip_address' => $log->ip_address,
                    'user_agent' => $log->user_agent,
                    'login_at' => $log->login_at?->toIso8601String(),
                    'request_count' => $log->request_count,
                    'last_request_at' => $log->last_request_at?->toIso8601String(),
                ])->values(),
            ];
        });

        return Inertia::render('admin/index', [
            'users' => $payload,
            'registrationEnabled' => RegistrationSetting::isEnabled(),
        ]);
    }
}
