<?php

return [
    'enabled' => env('RATE_LIMIT_ENABLED', true),

    'login' => (int) env('RATE_LIMIT_LOGIN_PER_MIN', 5),
    'register' => (int) env('RATE_LIMIT_REGISTER_PER_HOUR', 5),
    // Texting a verification code costs an SMS each time.
    'phone_code' => (int) env('RATE_LIMIT_PHONE_CODE_PER_10MIN', 3),
    'phone_verify' => (int) env('RATE_LIMIT_PHONE_VERIFY_PER_MIN', 10),
    'sms' => (int) env('RATE_LIMIT_SMS_PER_MIN', 10),
    // On-screen report views (JSON). Switching period filters fires several of these.
    'reports' => (int) env('RATE_LIMIT_REPORTS_PER_MIN', 60),
    // Heavy file downloads: CSV, XLSX and PDF.
    'report_exports' => (int) env('RATE_LIMIT_REPORT_EXPORTS_PER_MIN', 15),
];
