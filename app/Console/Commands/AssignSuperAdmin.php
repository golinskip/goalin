<?php

namespace App\Console\Commands;

use Domain\User\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('super-admin:assign {email : The email of the user to promote}')]
#[Description('Grant super admin access to the user with the given email')]
class AssignSuperAdmin extends Command
{
    public function handle(): int
    {
        $email = (string) $this->argument('email');

        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $this->error("No user found with email {$email}.");

            return self::FAILURE;
        }

        if ($user->isSuperAdmin()) {
            $this->info("{$email} is already a super admin.");

            return self::SUCCESS;
        }

        $user->forceFill(['is_super_admin' => true])->save();

        $this->info("{$email} is now a super admin.");

        return self::SUCCESS;
    }
}
