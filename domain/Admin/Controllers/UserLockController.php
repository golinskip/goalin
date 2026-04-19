<?php

namespace Domain\Admin\Controllers;

use App\Http\Controllers\Controller;
use Domain\User\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class UserLockController extends Controller
{
    public function store(Request $request, User $user): RedirectResponse
    {
        if ($user->isSuperAdmin()) {
            return back()->withErrors(['user' => 'Super admin accounts cannot be locked.']);
        }

        if ($user->id === $request->user()->id) {
            return back()->withErrors(['user' => 'You cannot lock your own account.']);
        }

        $user->forceFill(['locked_at' => now()])->save();

        return back();
    }

    public function destroy(User $user): RedirectResponse
    {
        $user->forceFill(['locked_at' => null])->save();

        return back();
    }
}
