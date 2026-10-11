<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('subscribers:recalculate-status')->daily();
Schedule::command('subscribers:send-due-reminders')->daily();
// Sign-ins now expire; clear out the ones that have been over for a day.
Schedule::command('sanctum:prune-expired --hours=24')->daily();