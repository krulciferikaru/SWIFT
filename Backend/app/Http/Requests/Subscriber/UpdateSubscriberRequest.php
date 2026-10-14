<?php

namespace App\Http\Requests\Subscriber;

use App\Http\Requests\Subscriber\Concerns\ReadsAddress;
use App\Models\Barangay;
use App\Models\Subscriber;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubscriberRequest extends FormRequest
{
    use ReadsAddress;

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->splitLegacyAddress();
    }

    public function rules(): array
    {
        $subscriberId = $this->route('subscriber');
        $current = Subscriber::withTrashed()->find($subscriberId);

        // A barangay that was switched off since is still allowed for someone who already lives in it.
        $barangays = array_values(array_unique(array_filter([...Barangay::activeNames(), $current?->barangay])));

        return [
            // A plan is never edited here: only the plan they are already on is accepted (and ignored). Moving to
            // another plan is a request that staff confirm ("Change plan").
            'plan_id' => ['sometimes', 'integer', function ($attribute, $value, $fail) use ($current) {
                if ($current && (int) $value !== (int) $current->plan_id) {
                    $fail('A plan cannot be edited here. Use Change plan, so the change is requested and confirmed.');
                }
            }],
            'name' => ['sometimes', 'string', 'max:255'],
            'barangay' => ['sometimes', 'string', Rule::in($barangays)],
            'street' => ['sometimes', 'nullable', 'string', 'max:120'],
            // Loose address text is only accepted when it is the one already on file (an older address with no
            // barangay, left as it is). Anything new has to be chosen from the barangay list.
            'address' => ['sometimes', 'string', 'max:255', function ($attribute, $value, $fail) use ($current) {
                if ($current && trim((string) $value) !== trim((string) $current->address)) {
                    $fail('Choose a barangay from the list.');
                }
            }],
            'contact_number' => ['sometimes', 'required', 'string', 'max:20'],
            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:100',
                Rule::unique('subscriber', 'email')->ignore($subscriberId, 'subscriber_id'),
            ],
            'mac_address' => [
                'nullable',
                'string',
                'max:17',
                Rule::unique('subscriber', 'mac_address')->ignore($subscriberId, 'subscriber_id'),
            ],
            'connection_date' => ['sometimes', 'date'],
            'status' => ['sometimes', 'in:Active,Unpaid,Disconnected'],
        ];
    }

    public function messages(): array
    {
        return [
            'plan_id.exists' => 'The selected plan does not exist.',
            'barangay.in' => 'Choose a barangay from the list.',
            'email.unique' => 'A subscriber with this email already exists.',
            'mac_address.unique' => 'This MAC address is already registered.',
        ];
    }
}
