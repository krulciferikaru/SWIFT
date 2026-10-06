<?php

return [
    'enabled' => env('RATE_LIMIT_ENABLED', true),

    'login' => (int) env('RATE_LIMIT_LOGIN_PER_MIN', 5),
    'register' => (int) env('RATE_LIMIT_REGISTER_PER_HOUR', 5),
    'sms' => (int) env('RATE_LIMIT_SMS_PER_MIN', 10),
    // On-screen report views (JSON). Switching period filters fires several of these.
    'reports' => (int) env('RATE_LIMIT_REPORTS_PER_MIN', 60),
    // Heavy file downloads: CSV, XLSX and PDF.
    'report_exports' => (int) env('RATE_LIMIT_REPORT_EXPORTS_PER_MIN', 15),
];
