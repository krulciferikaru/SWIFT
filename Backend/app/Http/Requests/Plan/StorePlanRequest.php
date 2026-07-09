<?php

namespace App\Http\Requests\Plan;

use Illuminate\Foundation\Http\FormRequest;

class StorePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'plan_name' => ['required', 'string', 'max:100', 'unique:plan,plan_name'],
            'monthly_rate' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string'],
            'speed_mbps' => ['nullable', 'integer', 'min:1'],
            'status' => ['sometimes', 'in:Active,Inactive'],
        ];
    }

    public function messages(): array
    {
        return [
            'plan_name.unique' => 'A plan with this name already exists.',
            'monthly_rate.min' => 'Monthly rate cannot be negative.',
        ];
    }
}
