<?php

return [
    'enabled' => env('RATE_LIMIT_ENABLED', true),

    'login' => (int) env('RATE_LIMIT_LOGIN_PER_MIN', 5),
    'register' => (int) env('RATE_LIMIT_REGISTER_PER_HOUR', 5),
    'sms' => (int) env('RATE_LIMIT_SMS_PER_MIN', 10),
    'reports' => (int) env('RATE_LIMIT_REPORTS_PER_MIN', 15),
];
