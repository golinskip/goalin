<?php

namespace Domain\Admin\Middleware;

use Closure;
use Domain\Admin\Models\UserActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\Response;

class TrackUserActivity
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $user = $request->user();

        if ($user === null || ! $request->hasSession()) {
            return $response;
        }

        $sessionId = $request->session()->getId();
        $now = Carbon::now();

        $log = UserActivityLog::query()
            ->where('user_id', $user->id)
            ->where('session_id', $sessionId)
            ->first();

        if ($log === null) {
            UserActivityLog::query()->create([
                'user_id' => $user->id,
                'session_id' => $sessionId,
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 255),
                'login_at' => $now,
                'request_count' => 1,
                'last_request_at' => $now,
            ]);

            return $response;
        }

        $log->forceFill([
            'ip_address' => $request->ip(),
            'request_count' => $log->request_count + 1,
            'last_request_at' => $now,
        ])->save();

        return $response;
    }
}
