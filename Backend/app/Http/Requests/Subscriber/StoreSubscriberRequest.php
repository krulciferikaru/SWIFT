<?php

namespace App\Http\Requests\Subscriber;

use App\Http\Requests\Subscriber\Concerns\ReadsAddress;
use App\Models\Barangay;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSubscriberRequest extends FormRequest
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
        return [
            'plan_id' => ['required', 'integer', 'exists:plan,plan_id'],
            'name' => ['required', 'string', 'max:255'],
            'barangay' => ['required', 'string', Rule::in(Barangay::activeNames())],
            'street' => ['nullable', 'string', 'max:120'],
            'contact_number' => ['required', 'string', 'max:20'],
            'email' => ['nullable', 'email', 'max:100', 'unique:subscriber,email'],
            'mac_address' => ['nullable', 'string', 'max:17', 'unique:subscriber,mac_address'],
            'connection_date' => ['required', 'date'],
            'status' => ['sometimes', 'in:Active,Unpaid,Disconnected'],
        ];
    }

    public function messages(): array
    {
        return [
            'plan_id.exists' => 'The selected plan does not exist.',
            'barangay.required' => 'Choose a barangay from the list.',
            'barangay.in' => 'Choose a barangay from the list.',
            'email.unique' => 'A subscriber with this email already exists.',
            'mac_address.unique' => 'This MAC address is already registered.',
        ];
    }
}
