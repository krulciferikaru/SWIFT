<?php

namespace App\Http\Requests\Plan;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePlanRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $planId = $this->route('plan');

        return [
            'plan_name'    => [
                'sometimes', 'string', 'max:100',
                Rule::unique('plan', 'plan_name')->ignore($planId, 'plan_id'),
            ],
            'monthly_rate' => ['sometimes', 'numeric', 'min:0'],
            'description'  => ['nullable', 'string'],
            'speed_mbps'   => ['nullable', 'integer', 'min:1'],
            'status'       => ['sometimes', 'in:Active,Inactive'],
        ];
    }
}
