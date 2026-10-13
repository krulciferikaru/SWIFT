<?php

return [
    // When a change of plan, or of a plan's price, starts to count. Months already billed are never
    // re-priced, whichever is chosen.
    //   next_month    the change applies from the first day of next month (this month's bill stays as it was)
    //   current_month the change applies from the first day of this month
    // This is a company decision; next_month is the careful default.
    'plan_change_effective' => env('PLAN_CHANGE_EFFECTIVE', 'next_month'),
];
