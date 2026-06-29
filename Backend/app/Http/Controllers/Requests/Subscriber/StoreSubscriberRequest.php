<?php

namespace App\Http\Requests\Subscriber;

use Illuminate\Foundation\Http\FormRequest;

class StoreSubscriberRequest extends FormRequest
{
    public function authorize(): bool
    {
        // Authorization is handled by middleware (auth:sanctum + role check)
        return true;
    }

    public function rules(): array
    {
        return [
            'plan_id'         => ['required', 'integer', 'exists:plan,plan_id'],
            'name'            => ['required', 'string', 'max:255'],
            'address'         => ['required', 'string', 'max:255'],
            'contact_number'  => ['nullable', 'string', 'max:20'],
            'email'           => ['required', 'email', 'max:100', 'unique:subscriber,email'],
            'mac_address'     => ['nullable', 'string', 'max:17', 'unique:subscriber,mac_address'],
            'connection_date' => ['required', 'date'],
            'status'          => ['sometimes', 'in:Active,Unpaid,Disconnected'],
        ];
    }

    public function messages(): array
    {
        return [
            'plan_id.exists'       => 'The selected plan does not exist.',
            'email.unique'         => 'A subscriber with this email already exists.',
            'mac_address.unique'   => 'This MAC address is already registered.',
        ];
    }
}
