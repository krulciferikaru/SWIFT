<?php

namespace App\Http\Controllers;

use App\Models\CompanyInfo;
use App\Services\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompanyInfoController extends Controller
{
    /**
     * GET /api/company-info  (public)
     *
     * How to reach the company. Public on purpose: the sign-in page shows it to people who
     * cannot log in yet. Only contact details an admin chose to enter are ever returned.
     */
    public function show(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => CompanyInfo::current()->only(CompanyInfo::FIELDS),
        ]);
    }

    /** PUT /api/company-info  (admin only) */
    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => ['nullable', 'string', 'max:60'],
            'mobile' => ['nullable', 'string', 'max:60'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'office_hours' => ['nullable', 'string', 'max:255'],
            'how_to_pay' => ['nullable', 'string', 'max:1000'],
        ]);

        $info = CompanyInfo::current();
        $before = $info->only(CompanyInfo::FIELDS);

        // Blank boxes are stored as "nothing", so they simply do not show.
        $info->update(array_map(fn ($v) => $v === null || trim($v) === '' ? null : trim($v), $validated));

        $changes = [];
        foreach ($info->only(CompanyInfo::FIELDS) as $field => $new) {
            if (($before[$field] ?? null) !== $new) {
                $changes[$field] = ['old' => $before[$field] ?? null, 'new' => $new];
            }
        }
        Audit::log('company.updated', null, 'Company information', $changes);

        return response()->json([
            'success' => true,
            'message' => 'Company information saved.',
            'data' => $info->only(CompanyInfo::FIELDS),
        ]);
    }
}
