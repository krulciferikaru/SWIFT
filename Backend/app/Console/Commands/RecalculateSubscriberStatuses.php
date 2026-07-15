<?php

namespace App\Console\Commands;

use App\Models\Subscriber;
use App\Services\BillingService;
use Illuminate\Console\Command;

class RecalculateSubscriberStatuses extends Command
{
    protected $signature = 'subscribers:recalculate-status';
    protected $description = 'Recalculates Active/Unpaid/Disconnected status for all subscribers based on payment history.';

    public function handle(BillingService $billing): int
    {
        $count = 0;
        Subscriber::where('account_status', 'active')->chunk(100, function ($subscribers) use ($billing, &$count) {
            foreach ($subscribers as $subscriber) {
                $billing->recalculateStatus($subscriber);
                $count++;
            }
        });

        $this->info("Recalculated status for {$count} subscribers.");
        return self::SUCCESS;
    }
}