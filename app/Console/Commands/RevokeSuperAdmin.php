<?php

namespace App\Console\Commands;

use Domain\User\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('super-admin:revoke {email : The email of the user to demote}')]
#[Description('Revoke super admin access from the user with the given email')]
class RevokeSuperAdmin extends Command
{
    public function handle(): int
    {
        $email = (string) $this->argument('email');

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $this->error("No user found with email {$email}.");

            return self::FAILURE;
        }

        if (! $user->isSuperAdmin()) {
            $this->info("{$email} is not a super admin.");

            return self::SUCCESS;
        }

        $user->forceFill(['is_super_admin' => false])->save();

        $this->info("Super admin access revoked from {$email}.");

        return self::SUCCESS;
    }
}
