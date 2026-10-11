<?php

return [
    // The default seeder creates demo accounts and sample data. It refuses to run in
    // production unless this is switched on, and then it needs a password you choose.
    'allow_demo_seed' => (bool) env('ALLOW_DEMO_SEED', false),
    'demo_password' => env('SEED_DEMO_PASSWORD'),
];
