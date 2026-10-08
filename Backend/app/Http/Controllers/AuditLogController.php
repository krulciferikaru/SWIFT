<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    /**
     * GET /api/audit-logs  (admin only)
     *
     * ?search=  matches who, what was acted on, or the action name
     * ?action=  exact action, or a prefix such as "subscriber" to get subscriber.*
     * ?from= ?to=  date range (inclusive)
     */
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search')->toString().'%';
                $q->where(fn ($n) => $n->where('user_name', 'like', $term)
                    ->orWhere('subject_label', 'like', $term)
                    ->orWhere('action', 'like', $term));
            })
            ->when($request->filled('action'), function ($q) use ($request) {
                $action = $request->string('action')->toString();
                $q->where(fn ($n) => $n->where('action', $action)->orWhere('action', 'like', $action.'.%'));
            })
            ->when($request->filled('from'), fn ($q) => $q->where('created_at', '>=', $request->date('from')->startOfDay()))
            ->when($request->filled('to'), fn ($q) => $q->where('created_at', '<=', $request->date('to')->endOfDay()))
            ->orderByDesc('id');

        return response()->json([
            'success' => true,
            'data' => $query->paginate(min($request->integer('per_page', 25), 100)),
        ]);
    }
}
