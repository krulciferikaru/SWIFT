<?php

return [
    // Every subscriber is billed on the same calendar (see App\Support\BillingCycle): a statement is issued on
    // this day of each month and bills the next month; it is due on the last day of the month it was issued in.
    'statement_day' => (int) env('BILLING_STATEMENT_DAY', 16),

    // Days after the due date before an unpaid month counts against the subscriber (Unpaid). None by default.
    'grace_days' => (int) env('BILLING_GRACE_DAYS', 0),

    // A requested change of plan is carried out within this many hours (the usual 24 to 48 hours): staff can
    // confirm it once this time has passed. The new price starts with the first statement after it is confirmed.
    'plan_change_hours' => (int) env('PLAN_CHANGE_HOURS', 48),
];
