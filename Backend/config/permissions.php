<?php

/*
 * What a staff member can do, one switch per task.
 *
 * - Admins always have every permission and can't be restricted.
 * - Secretaries get all of the "grantable" ones by default (the way the system worked before
 *   permissions existed). An admin can switch individual ones off for a particular secretary.
 * - "users.manage" and "audit.view" are admin-only and can never be granted.
 */
return [
    'grantable' => [
        'subscribers.view' => ['label' => 'View subscribers', 'help' => 'See the subscriber list and each subscriber\'s details.'],
        'subscribers.manage' => ['label' => 'Add and edit subscribers', 'help' => 'Add new subscribers, edit their details and change their status.'],
        'subscribers.archive' => ['label' => 'Archive subscribers', 'help' => 'Move subscribers to the Archive.'],
        'approvals.manage' => ['label' => 'Approve registrations', 'help' => 'Approve or reject new registrations and account claims.'],
        'plans.manage' => ['label' => 'Manage service plans', 'help' => 'Add, edit and archive service plans.'],
        'payments.view' => ['label' => 'View payments', 'help' => 'Open the Payments page and see payment history and balances.'],
        'payments.record' => ['label' => 'Record payments', 'help' => 'Enter a payment received from a subscriber.'],
        'reports.view' => ['label' => 'View and export reports', 'help' => 'Open Reports and download PDF or Excel files.'],
        'archive.manage' => ['label' => 'Use the Archive', 'help' => 'See archived records, restore them, or delete them permanently.'],
        'sms.send' => ['label' => 'Send text messages', 'help' => 'Send payment reminders and other text messages.'],
    ],

    'admin_only' => ['users.manage', 'audit.view'],
];
