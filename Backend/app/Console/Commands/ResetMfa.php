<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\Audit;
use Illuminate\Console\Command;

/**
 * For an administrator who has lost both their phone and their recovery codes. It is a command
 * on the server, not a button in the system, so it is not something anyone at the office can do:
 * it takes whoever looks after the server. The administrator sets up the app again at next sign-in.
 */
class ResetMfa extends Command
{
    protected $signature = 'swift:reset-mfa {email : The administrator\'s email address}';

    protected $description = 'Turn off two-step sign-in for an administrator who is locked out (they set it up again at next sign-in)';

    public function handle(): int
    {
        $user = User::where('email', $this->argument('email'))->where('role', 'admin')->first();
        if (! $user) {
            $this->error('No administrator with that email address.');

            return self::FAILURE;
        }

        $user->forceFill(['mfa_secret' => null, 'mfa_enabled_at' => null, 'mfa_recovery_codes' => null, 'mfa_last_step' => null])->save();
        $user->tokens()->delete();
        Audit::log('auth.mfa_reset', $user, null, ['by' => 'server command'], null);

        $this->info("Two-step sign-in was reset for {$user->email}. They will be asked to set it up again when they sign in.");

        return self::SUCCESS;
    }
}
