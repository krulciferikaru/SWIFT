<?php

namespace App\Http\Requests\Subscriber\Concerns;

use App\Models\Barangay;

/**
 * An address comes in as a barangay (from the admin's list) and an optional street; the city is always
 * Palayan City. The older single "address" text is still understood when it ends with a barangay on the list
 * ("12 Rizal St, Malete, Palayan City"), so existing callers keep working.
 */
trait ReadsAddress
{
    protected function splitLegacyAddress(): void
    {
        if ($this->filled('barangay') || ! $this->filled('address')) {
            return;
        }

        $parts = Barangay::split((string) $this->input('address'));
        if ($parts) {
            $this->merge(['street' => $parts[0], 'barangay' => $parts[1]]);
            // The full text is rebuilt from the barangay and street, so the loose text is not kept.
            $this->getInputSource()->remove('address');
        }
    }
}
