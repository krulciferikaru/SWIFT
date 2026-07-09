<?php

namespace App\Http\Requests\Subscriber;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSubscriberRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $subscriberId = $this->route('subscriber');

        return [
            'plan_id' => ['sometimes', 'integer', 'exists:plan,plan_id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string', 'max:255'],
            'contact_number' => ['nullable', 'string', 'max:20'],
            'email' => [
                'sometimes',
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
            'email.unique' => 'A subscriber with this email already exists.',
            'mac_address.unique' => 'This MAC address is already registered.',
        ];
    }
}
