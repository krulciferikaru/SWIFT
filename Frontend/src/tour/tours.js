// Each step points at an element tagged with data-tour="<name>". Steps whose
// element is missing or hidden (e.g. data still loading) are skipped at runtime.
const t = (name) => `[data-tour="${name}"]`

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
        description: 'Type a name, email, address or MAC address. The list filters as you type.',
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
          'Each row has Edit, Delete and Payments. Delete cannot be undone, and Payments opens that subscriber\'s billing.',
        side: 'top',
      },
    ],
  },

  approvals: {
    title: 'Approvals tour',
    steps: [
      {
        selector: t('approvals-tabs'),
        title: 'Three lists',
        description:
          'Pending is new sign-ups. Rejected holds ones you turned down, and you can re-approve them. Account Claims is someone registering with the email of an existing subscriber: check the details against your records before approving.',
        side: 'bottom',
      },
    ],
  },

  payments: {
    title: 'Payments tour',
    steps: [
      {
        selector: t('payments-search'),
        title: 'Find the subscriber',
        description: 'Search by name, email or MAC address, then click the subscriber in the results.',
        side: 'bottom',
      },
      {
        selector: t('payments-balance'),
        title: 'Balance',
        description:
          'Their current status and balance due. If they were disconnected and have paid off the balance, a Reconnect button appears. Use it only after you have reconnected the service.',
        side: 'bottom',
      },
      {
        selector: t('payments-form'),
        title: 'Record a payment',
        description:
          'Enter the amount, OR number, date and method. A live preview shows which months the payment covers. Click Record Payment to save.',
        side: 'left',
      },
    ],
    note: 'Pick a subscriber first to see the balance and payment form in this tour.',
  },

  reports: {
    title: 'Reports tour',
    steps: [
      {
        selector: t('reports-month'),
        title: 'Choose a month',
        description: 'Reports are for one month at a time. Change it and the reports reload.',
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
}

export const TOUR_PAGES = {
  subscribers: '/subscribers',
  approvals: '/approvals',
  payments: '/payments',
  reports: '/reports',
}
