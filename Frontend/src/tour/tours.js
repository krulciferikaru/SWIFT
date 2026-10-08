// Each step points at an element tagged with data-tour="<name>".
//   click   - selector to click before the step (e.g. switch a tab); the step is
//             skipped if its element never appears
//   roles   - only show to these roles
//   restore - (tour level) selector(s) clicked in order when the tour ends, if it
//             switched tabs, to put the page back how it was
// Steps without `click` are skipped when their element is missing or hidden.
const t = (name) => `[data-tour="${name}"]`
const STAFF = ['admin', 'secretary']

export const TOURS = {
  layout: {
    title: 'Welcome to SWIFT',
    steps: [
      {
        selector: t('nav'),
        title: 'Navigation',
        description:
          'Everything in SWIFT is reached from this menu. Hover it when it is collapsed to see the labels.',
        side: 'right',
      },
      {
        selector: t('nav-approvals'),
        title: 'Pending Approvals',
        description:
          'New sign-ups wait here until you approve them. The number shows how many need attention.',
        side: 'right',
      },
      {
        selector: t('nav-payments'),
        title: 'Payments',
        description: 'Search a subscriber, see their balance, and record a payment.',
        side: 'right',
      },
      {
        selector: t('nav-reports'),
        title: 'Reports',
        description: 'Monthly collections and financial statements, downloadable as PDF or Excel.',
        side: 'right',
      },
      {
        selector: t('nav-audit'),
        title: 'Audit Trail',
        description: 'Admins can see who did what, and when: sign-ins, edits, payments, approvals and more.',
        side: 'right',
        roles: ['admin'],
      },
      {
        selector: t('theme-toggle'),
        title: 'Light and dark mode',
        description: 'Switch the appearance whenever you like.',
        side: 'right',
      },
      {
        selector: t('nav-guide'),
        title: 'Need help later?',
        description:
          'The Guide explains every screen, and each section has a "Show me" button that starts a tour of that page.',
        side: 'right',
      },
      {
        selector: t('mobile-menu'),
        title: 'Menu',
        description:
          'On a phone, tap here to open the menu. It has every page, the theme switch, and Logout.',
        side: 'bottom',
      },
    ],
  },

  dashboard: {
    title: 'Dashboard tour',
    steps: [
      {
        selector: t('dash-attention'),
        title: 'Needs Attention',
        description:
          'Only appears when something is waiting for a decision, like new applications or account claims. Click an item to jump straight to it.',
        side: 'bottom',
      },
      {
        selector: t('dash-financials'),
        title: 'Money this month',
        description:
          'Collected This Month, Total Outstanding, and the Collection Rate. Click a card to open Payments or Reports.',
        side: 'bottom',
      },
      {
        selector: t('dash-counts'),
        title: 'Subscriber counts',
        description:
          'Total subscribers, pending applications, account claims, and how many are Active or Unpaid. Each card opens the matching page.',
        side: 'bottom',
      },
      {
        selector: t('dash-trend'),
        title: 'Revenue trend',
        description: 'Collections over recent months, with the change compared to last month.',
        side: 'top',
      },
      {
        selector: t('dash-status'),
        title: 'Subscriber status',
        description: 'A chart of how your subscribers split between Active, Unpaid and Disconnected.',
        side: 'top',
      },
      {
        selector: t('dash-actions'),
        title: 'Quick actions',
        description: 'Shortcuts to the things you do most: record a payment, manage subscribers, view reports.',
        side: 'top',
      },
    ],
  },

  dashboardSubscriber: {
    title: 'My Account tour',
    steps: [
      {
        selector: t('me-verify'),
        title: 'Verify your mobile number',
        description:
          'Click Verify now and we text you a 6-digit code. Type it in to confirm the number is yours, so reminders and notices reach you. This prompt disappears once you are verified.',
        side: 'bottom',
      },
      {
        selector: t('me-summary'),
        title: 'Your account at a glance',
        description:
          'Your plan and monthly rate, your current balance, and how many months you are behind.',
        side: 'bottom',
      },
      {
        selector: t('me-breakdown'),
        title: 'Monthly breakdown',
        description: 'Each month and whether it is paid or still unpaid.',
        side: 'top',
      },
      {
        selector: t('me-payments'),
        title: 'Payment history',
        description:
          'Every payment the company has recorded for you, newest first, with the total paid. Use the year filter to narrow it, and click Receipt beside a payment to see and print a receipt. For payments, refunds or reconnection, contact the company directly.',
        side: 'top',
      },
    ],
  },

  subscribers: {
    title: 'Subscribers tour',
    steps: [
      {
        selector: t('subs-summary'),
        title: 'At a glance',
        description: 'Totals for every status: Pending, Active, Unpaid and Disconnected.',
        side: 'bottom',
      },
      {
        selector: t('subs-search'),
        title: 'Search',
        description: 'Type a name, contact number, address or MAC address. The list filters as you type.',
        side: 'bottom',
      },
      {
        selector: t('subs-status'),
        title: 'Filter by status',
        description: 'Show only Active, Unpaid or Disconnected subscribers.',
        side: 'bottom',
      },
      {
        selector: t('subs-export'),
        title: 'Export CSV',
        description: 'Download the current list as a spreadsheet. You get a preview first.',
        side: 'bottom',
      },
      {
        selector: t('subs-add'),
        title: 'Add Subscriber',
        description: 'Register a new subscriber by hand: name, plan and contact details.',
        side: 'bottom',
      },
      {
        selector: t('subs-table'),
        title: 'Subscriber list',
        description:
          'One row per subscriber. A green Verified tag beside a contact number means the subscriber confirmed it with a texted code. On a phone, each subscriber appears as a card.',
        side: 'top',
      },
      {
        selector: t('subs-name'),
        title: 'Click a name for the details',
        description:
          'Every name is a link, shown in blue with an arrow. Click it to open a window with everything about that subscriber in one place, including their balance, with the same Edit, Archive and Payments buttons.',
        side: 'right',
      },
      {
        selector: t('subs-actions'),
        title: 'Edit, Archive and Payments',
        description:
          'Edit changes their details. Archive hides the subscriber and pauses their login, but nothing is lost: restore them from the Archive page. Payments opens that subscriber\'s billing and receipts. Buttons you are not allowed to use are not shown.',
        side: 'left',
      },
    ],
  },

  approvals: {
    title: 'Approvals tour',
    restore: [t('approvals-tab-claims'), t('approvals-subtab-pending'), t('approvals-tab-pending')],
    steps: [
      {
        selector: t('approvals-tabs'),
        title: 'Three lists',
        description:
          'Pending is new sign-ups, Rejected holds ones you turned down, and Account Claims is someone registering with the contact number of an existing subscriber. This tour visits each one.',
        side: 'bottom',
      },
      {
        selector: t('approvals-search'),
        title: 'Search',
        description: 'Filter any of these lists by name, contact number or email.',
        side: 'bottom',
      },
      {
        click: t('approvals-tab-pending'),
        selector: t('approvals-row-actions'),
        title: 'Pending: approve or reject',
        description:
          'Approve activates the subscriber so they can log in. Reject asks you to confirm first, and you can undo it later from the Rejected tab. If nothing is waiting, the dashed sample row shows what a real one looks like.',
        side: 'left',
      },
      {
        click: t('approvals-tab-rejected'),
        selector: t('approvals-row-actions'),
        title: 'Rejected: re-approve',
        description:
          'Turned someone down by mistake? Re-approve moves them back to active. Rejected applications are kept here, not deleted.',
        side: 'left',
      },
      {
        click: t('approvals-tab-claims'),
        selector: t('approvals-claims-subtabs'),
        title: 'Account Claims',
        description:
          'This list has two sub-tabs: Pending Claims and Rejected Claims. A claim happens when someone registers with the contact number of a subscriber who is already on file.',
        side: 'bottom',
      },
      {
        click: t('approvals-subtab-pending'),
        selector: t('approvals-row-actions'),
        title: 'Pending Claims',
        description:
          'Compare the requested name with the "Existing Subscriber on File" column (name, address, contact number) before you approve. Approving links this login to that subscriber\'s billing history. Reject if the details do not match.',
        side: 'left',
      },
      {
        click: t('approvals-subtab-rejected'),
        selector: t('approvals-row-actions'),
        title: 'Rejected Claims',
        description:
          'Claims you rejected stay here. Re-approve if you rejected one in error. The original subscriber record is never changed by a rejection.',
        side: 'left',
      },
    ],
  },

  plans: {
    title: 'Service Plans tour',
    steps: [
      {
        selector: t('plans-add'),
        title: 'Add a plan',
        description: 'Create a new plan with a name, monthly rate, speed and description.',
        side: 'bottom',
      },
      {
        selector: t('plans-table'),
        title: 'Your plans',
        description:
          'Name, monthly rate, speed and whether the plan is Active. Every subscriber is assigned one of these.',
        side: 'top',
      },
      {
        selector: t('plans-name'),
        title: 'Click a name for the details',
        description:
          'Every plan name is a link, shown in blue with an arrow. Click it to open a window with the full details of that plan and the same Edit and Archive buttons.',
        side: 'right',
      },
      {
        selector: t('plans-row-actions'),
        title: 'Edit or archive',
        description:
          'Edit changes future billing only, not past payments. Archive stops offering the plan to new subscribers; subscribers already on it keep it and are billed as usual. Restore it from the Archive page.',
        side: 'left',
      },
    ],
  },

  payments: {
    title: 'Payments tour',
    steps: [
      {
        selector: t('payments-search'),
        title: 'Find the subscriber',
        description: 'Search by name, contact number or MAC address, then click the subscriber in the results.',
        side: 'bottom',
      },
      {
        selector: t('payments-balance'),
        title: 'Balance',
        description:
          'Their current status and balance due. If they were disconnected and have paid off the balance, a Reconnect button appears. Use it only after you have reconnected the service. (If you have not picked a subscriber yet, this is a sample.)',
        side: 'bottom',
      },
      {
        selector: t('payments-form'),
        title: 'Record a payment',
        description:
          'Enter the amount, OR number, date and method. A live preview shows which months the payment covers. Click Record Payment to save.',
        side: 'left',
      },
      {
        selector: t('payments-history'),
        title: 'Payment history and receipts',
        description:
          'Every payment for this subscriber, newest first, with the total paid and a year filter. Click Receipt beside a payment to see a receipt you can print and hand to the subscriber.',
        side: 'top',
      },
    ],
  },

  reports: {
    title: 'Reports tour',
    steps: [
      {
        selector: t('reports-range'),
        title: 'Choose the period',
        description:
          'Monthly shows one month, Last 3 Months covers the past three months up to today, and Annual shows a whole year. The reports reload when you switch.',
        side: 'bottom',
      },
      {
        selector: t('reports-month'),
        title: 'Pick the month',
        description: 'With Monthly selected, choose which month to report on.',
        side: 'bottom',
      },
      {
        selector: t('reports-collections'),
        title: 'Monthly Collection Report',
        description:
          'How much was collected, by plan and by payment method, plus the full payment ledger. Use PDF or XLSX to download.',
        side: 'top',
      },
      {
        selector: t('reports-financial'),
        title: 'Financial Statement',
        description: 'Who owes what: receivables, paid and outstanding balances, per plan and per subscriber.',
        side: 'top',
      },
    ],
  },

  users: {
    title: 'Manage Roles tour',
    steps: [
      {
        selector: t('users-add'),
        title: 'Add Staff Account',
        description:
          'Creates a new Secretary login. A role cannot be changed after the account is created, as a safety measure.',
        side: 'bottom',
      },
      {
        selector: t('users-filters'),
        title: 'Search and filter',
        description: 'Find an account by name or email, or filter by role.',
        side: 'bottom',
      },
      {
        selector: t('users-table'),
        title: 'All accounts',
        description: 'Admins, Secretaries and Subscribers all appear here.',
        side: 'top',
      },
      {
        selector: t('users-permissions'),
        title: 'Permissions',
        description:
          'Choose exactly what a secretary may do: for example view subscribers but not record payments. Tick the tasks, then Save. Reset to default gives them everything again. Pages and buttons they are not allowed to use disappear for them. Admins always have everything.',
        side: 'left',
      },
      {
        selector: t('users-status'),
        title: 'Account status',
        description:
          'Set an account to Pending, Active or Inactive. An Inactive account cannot log in. You cannot change your own status.',
        side: 'left',
      },
      {
        selector: t('users-reset'),
        title: 'Reset Password',
        description:
          'There is no self-service "forgot password" in SWIFT. If someone forgets theirs, set a new one for them here.',
        side: 'left',
      },
    ],
  },

  settings: {
    title: 'Settings tour',
    steps: [
      {
        selector: t('settings-appearance'),
        title: 'Appearance',
        description: 'Switch between light and dark mode.',
        side: 'bottom',
      },
      {
        selector: t('settings-account'),
        title: 'Logout confirmation',
        description: 'Turn off the "are you sure?" prompt if you do not want it every time you log out.',
        side: 'bottom',
      },
      {
        selector: t('settings-guidance'),
        title: 'Tour options',
        description:
          'Hide the "Take a tour" buttons if you no longer need them, or replay the welcome tour whenever you like.',
        side: 'bottom',
      },
      {
        selector: t('settings-phone'),
        title: 'Verify your mobile number',
        description:
          'If your account has a mobile number, verify it here: we text you a 6-digit code, and you type it in. A new code can be requested after a minute, and a code works for 10 minutes. If you change your number, verify it again.',
        side: 'bottom',
      },
      {
        selector: t('settings-sms'),
        title: 'Send SMS',
        description: 'Send a one-off text message to any Philippine mobile number.',
        side: 'top',
        roles: STAFF,
      },
      {
        selector: t('settings-reminders'),
        title: 'Payment Reminders',
        description:
          'Sends a balance reminder SMS to every subscriber currently marked Unpaid. The number of unpaid subscribers is shown first.',
        side: 'top',
        roles: STAFF,
      },
    ],
  },
}

// Form tours run inside a modal dialog, so selectors are scoped to it.
const d = (name) => `[role="dialog"] [data-tour="${name}"]`
const dlg = (sel) => `[role="dialog"] ${sel}`

TOURS.subscriberForm = {
  title: 'Subscriber form tour',
  steps: [
    {
      selector: d('sub-plan'),
      title: 'Service Plan',
      description:
        'Pick the plan this subscriber pays for. The monthly rate shown beside each plan is what they are billed.',
      side: 'bottom',
    },
    {
      selector: d('sub-status'),
      title: 'Status',
      description:
        'Leave this on Active for a new subscriber. SWIFT keeps it up to date from payments: Active, Unpaid or Disconnected.',
      side: 'bottom',
    },
    {
      selector: dlg('#name'),
      title: 'Full Name',
      description:
        'The name as it should appear on bills. While you type, SWIFT warns you if a similar subscriber already exists. If it is the same person, edit that record instead of adding a duplicate.',
      side: 'bottom',
    },
    {
      selector: dlg('#contact_number'),
      title: 'Contact Number',
      description:
        'Required. Used for SMS reminders, and it is how a subscriber can later claim their own login: if someone registers with this number, it appears under Account Claims for you to verify. Use the format 09XX-XXX-XXXX.',
      side: 'bottom',
    },
    {
      selector: dlg('#email'),
      title: 'Email Address',
      description: 'Optional. Add it if the subscriber has one; the number above is what identifies them.',
      side: 'top',
    },
    {
      selector: dlg('#address'),
      title: 'Address',
      description: 'Required. Their service address, for example the barangay and Palayan City.',
      side: 'top',
    },
    {
      selector: dlg('#mac_address'),
      title: 'MAC Address',
      description: 'Optional. The address of the subscriber\'s equipment. Just type the 12 letters and numbers: the colons are filled in for you (XX:XX:XX:XX:XX:XX).',
      side: 'top',
    },
    {
      selector: dlg('#connection_date'),
      title: 'Connection Date',
      description:
        'Required. The date service started. Billing is counted from this date, so a date in the past means the earlier months count as due.',
      side: 'top',
    },
    {
      selector: dlg('button[type="submit"]'),
      title: 'Save',
      description:
        'Fields marked with a red * are required. If something is missing or wrong, a red message appears under that field.',
      side: 'top',
    },
  ],
}

TOURS.planForm = {
  title: 'Plan form tour',
  steps: [
    {
      selector: dlg('#plan_name'),
      title: 'Plan name',
      description: 'The name subscribers and staff will see, for example "Home Plus".',
      side: 'bottom',
    },
    {
      selector: dlg('#monthly_rate'),
      title: 'Monthly rate',
      description:
        'What each subscriber on this plan is billed every month, in pesos. Changing it later affects future billing, not past payments.',
      side: 'bottom',
    },
    {
      selector: dlg('#speed_mbps'),
      title: 'Speed',
      description: 'Optional. The internet speed in Mbps, for reference.',
      side: 'bottom',
    },
    {
      selector: dlg('#description'),
      title: 'Description',
      description: 'Optional notes about what the plan includes.',
      side: 'top',
    },
    {
      selector: d('plan-status'),
      title: 'Status',
      description: 'Active plans can be given to subscribers. Mark a plan Inactive to stop offering it without deleting it.',
      side: 'top',
    },
    {
      selector: dlg('button[type="submit"]'),
      title: 'Save',
      description: 'Saves the plan. Required fields are marked with a red *.',
      side: 'top',
    },
  ],
}

TOURS.staffForm = {
  title: 'Staff account form tour',
  steps: [
    {
      selector: dlg('#staff-name'),
      title: 'Full Name',
      description: 'The staff member\'s name, shown in the sidebar and in records.',
      side: 'bottom',
    },
    {
      selector: dlg('#staff-email'),
      title: 'Email',
      description: 'Their login email. It must not already be used by another account.',
      side: 'bottom',
    },
    {
      selector: d('staff-role'),
      title: 'Role',
      description:
        'The role is fixed when the account is created and cannot be changed afterwards, so choose carefully.',
      side: 'bottom',
    },
    {
      selector: dlg('#staff-password'),
      title: 'Password',
      description: 'Their first password. Share it privately. You can reset it later from the accounts list.',
      side: 'top',
    },
    {
      selector: dlg('#staff-password-confirm'),
      title: 'Confirm Password',
      description: 'Type the same password again to make sure there is no typo.',
      side: 'top',
    },
    {
      selector: dlg('button[type="submit"]'),
      title: 'Create account',
      description: 'Creates the login. The new staff member can sign in right away.',
      side: 'top',
    },
  ],
}

TOURS.archive = {
  title: 'Archive tour',
  restore: [t('archive-tab-subscribers')],
  steps: [
    {
      selector: t('archive-tabs'),
      title: 'Archived records',
      description:
        'Subscribers and service plans you archive end up here. Archiving hides them from the rest of the system, but nothing is lost.',
      side: 'bottom',
    },
    {
      click: t('archive-tab-subscribers'),
      selector: t('archive-search'),
      title: 'Search archived subscribers',
      description: 'Find one by name, contact number, address or MAC address.',
      side: 'bottom',
    },
    {
      click: t('archive-tab-subscribers'),
      selector: t('archive-row-actions'),
      title: 'Restore or delete a subscriber',
      description:
        'Restore puts the subscriber back on the list and lets them log in again. Delete removes them for good, along with their payment history and login, so only use it when you are sure. If nothing is archived, the dashed sample row shows what an entry looks like.',
      side: 'left',
    },
    {
      click: t('archive-tab-plans'),
      selector: t('archive-row-actions'),
      title: 'Restore or delete a plan',
      description:
        'Restore offers the plan to new subscribers again. Delete removes it permanently, and a plan that is still assigned to any subscriber cannot be deleted.',
      side: 'left',
    },
  ],
}

TOURS.audit = {
  title: 'Audit Trail tour',
  steps: [
    {
      selector: t('audit-filters'),
      title: 'Find an entry',
      description:
        'Search by the name of a person or the record they touched, narrow it to one kind of activity (sign-ins, payments, plans and so on), or pick a date range.',
      side: 'bottom',
    },
    {
      selector: t('audit-table'),
      title: 'Who did what, and when',
      description:
        'Each row shows when it happened, who did it, what they did and which record it was. Edits list what changed, with the old value crossed out beside the new one. Entries cannot be edited or deleted from SWIFT, and passwords are never recorded.',
      side: 'top',
    },
  ],
}

export const TOUR_PAGES = {
  dashboard: '/dashboard',
  subscribers: '/subscribers',
  approvals: '/approvals',
  plans: '/plans',
  payments: '/payments',
  reports: '/reports',
  archive: '/archive',
  users: '/users',
  settings: '/settings',
  audit: '/audit',
}
