<?php

namespace App\Console\Commands;

use App\Models\Subscriber;
use App\Services\BillingService;
use App\Services\PhilSmsService;
use Illuminate\Console\Command;

class SendDueReminders extends Command
{
    protected $signature = 'subscribers:send-due-reminders';
    protected $description = 'Sends an SMS to subscribers whose monthly bill is due tomorrow.';

    public function handle(BillingService $billing, PhilSmsService $sms): int
    {
        $sent = 0;
        $failed = 0;

        Subscriber::where('account_status', 'active')
            ->where('status', '!=', 'Disconnected')
            ->chunk(100, function ($subscribers) use ($billing, $sms, &$sent, &$failed) {
                foreach ($subscribers as $subscriber) {
                    if (!$billing->isDueTomorrow($subscriber)) {
                        continue;
                    }

                    $result = $sms->sendToSubscriber($subscriber, sprintf(
                        'Hi %s, this is a reminder that your monthly bill is due tomorrow. Please settle your balance to avoid service interruption. - Jubal Brothers Cable TV Corp - Palayan Branch',
                        $subscriber->name,
                    ));

                    $result['success'] ? $sent++ : $failed++;
                }
            });

        $this->info("Sent due-date reminders to {$sent} subscriber(s)." . ($failed > 0 ? " {$failed} failed to send." : ''));
        return self::SUCCESS;
    }
}
