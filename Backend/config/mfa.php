<?php

return [
    // Administrators must use an authenticator app when signing in. An administrator who has not
    // set one up yet can sign in, but can do nothing except set it up. Switch this off only on a
    // development machine.
    'enforce_for_admins' => (bool) env('MFA_ENFORCE', true),

    // The name shown in the authenticator app next to the six digits.
    'issuer' => env('MFA_ISSUER', 'SWIFT'),

    // After this many wrong codes in a row the second step is paused for the lockout time.
    'max_failures' => (int) env('MFA_MAX_FAILURES', 5),
    'lockout_minutes' => (int) env('MFA_LOCKOUT_MINUTES', 15),

    // How long someone has, after the right password, to type the code.
    'challenge_minutes' => 5,

    'recovery_code_count' => 8,
];
