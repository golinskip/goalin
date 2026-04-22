<?php

namespace Domain\ExternalServices\Controllers;

use App\Http\Controllers\Controller;
use Domain\ExternalServices\Enums\ServiceType;
use Domain\ExternalServices\Requests\StoreTodoistConnectionRequest;
use Domain\ExternalServices\Services\TodoistService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class TodoistConnectionController extends Controller
{
    public function store(StoreTodoistConnectionRequest $request, TodoistService $todoist): RedirectResponse
    {
        $token = $request->validated('api_token');

        if (! $todoist->verifyToken($token)) {
            return back()->withErrors([
                'api_token' => 'The API token is invalid or could not be verified with Todoist.',
            ]);
        }

        $user = $request->user();

        $user->serviceConnections()->updateOrCreate(
            ['service' => ServiceType::Todoist->value],
            ['access_token' => $token],
        );

        Cache::forget("todoist:tasks:user:{$user->id}");

        return to_route('external-services.edit');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $user = $request->user();

        $user->serviceConnections()
            ->where('service', ServiceType::Todoist->value)
            ->delete();

        Cache::forget("todoist:tasks:user:{$user->id}");

        return to_route('external-services.edit');
    }
}
