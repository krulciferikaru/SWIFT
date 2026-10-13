<?php

namespace App\Services;

use Carbon\CarbonInterface;

/** One subscriber's plan and price over time (see RateHistoryService::scheduleFor). */
class RateSchedule
{
    /**
     * @param  list<object>  $planLines  { plan_id, effective_from } oldest first
     * @param  list<object>  $rateLines  { plan_id, monthly_rate, effective_from } oldest first
     */
    public function __construct(
        private array $planLines,
        private array $rateLines,
        private ?int $currentPlanId,
        private float $currentRate,
    ) {}

    /** The monthly price that applied in the month starting on the given day. */
    public function rateAt(CarbonInterface $monthStart): float
    {
        $day = $monthStart->toDateString();

        $planId = null;
        foreach ($this->planLines as $line) {
            if ($line->effective_from <= $day) {
                $planId = (int) $line->plan_id;
            }
        }
        $planId ??= $this->currentPlanId;

        if ($planId === null) {
            return $this->currentRate;
        }

        $rate = null;
        foreach ($this->rateLines as $line) {
            if ((int) $line->plan_id === $planId && $line->effective_from <= $day) {
                $rate = (float) $line->monthly_rate;
            }
        }

        return $rate ?? $this->currentRate;
    }
}
