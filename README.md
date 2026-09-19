# SWIFT

SWIFT is a subscriber and billing management system built for **Jubal Brothers Cable TV Corp — Palayan Branch**. It replaces manual collection ledgers with a staff dashboard for managing cable TV/internet subscribers, tracking monthly billing and payments, generating financial reports, and notifying subscribers by SMS.

## Features

- **Subscriber management** — masterlist with search/filter, status tracking (Active, Unpaid, Disconnected), and a pending-approval workflow for new signups.
- **Billing & payments** — automatic monthly billing breakdowns per subscriber plan, payment recording (Cash/GCash/Others), and balance tracking.
- **Reports** — subscriber lists, monthly collections, and financial statements, exportable as PDF, XLSX, and CSV.
- **SMS notifications** (via [PhilSMS](https://app.philsms.com)) — payment confirmations, subscriber approval/rejection, status-change alerts, payment reminders, and an ad-hoc send tool for staff.
- **Role-based access** — Admin, Secretary, and Subscriber roles with scoped permissions.
- **Subscriber self-service dashboard** — subscribers can view their own billing and payment history.

## Tech Stack

| | |
|---|---|
| Backend | [Laravel 13](https://laravel.com) (PHP 8.3), [Sanctum](https://laravel.com/docs/sanctum) token auth, MySQL |
| Frontend | [React 19](https://react.dev) + [Vite](https://vite.dev), Tailwind CSS, shadcn-style components |
| SMS | [PhilSMS](https://app.philsms.com) API |
| Deployment | [Railway](https://railway.com) (backend + MySQL), [Vercel](https://vercel.com) (frontend) |

## Project Structure

```
SWIFT/
├── Backend/   # Laravel API
└── Frontend/  # React SPA (Vite)
```

## Getting Started

### Prerequisites

- PHP 8.3+ and [Composer](https://getcomposer.org)
- Node.js 20+ and npm
- MySQL

### Backend setup

```bash
cd Backend
composer install
cp .env.example .env
php artisan key:generate
```

Edit `.env` with your database credentials and [PhilSMS](https://app.philsms.com/developers) API token, then:

```bash
php artisan migrate
php artisan serve
```

The API runs at `http://localhost:8000`.

### Frontend setup

```bash
cd Frontend
npm install
npm run dev
```

The app runs at `http://localhost:5173`. By default it talks to the backend at `http://localhost:8000/api` — set `VITE_API_URL` in a `.env` file (see [`.env.example`](Frontend/.env.example)) to point elsewhere.

## Environment Variables

See [`Backend/.env.example`](Backend/.env.example) and [`Frontend/.env.example`](Frontend/.env.example) for the full list. Notably:

- `FRONTEND_URL` (backend) — deployed frontend origin(s), for CORS.
- `VITE_API_URL` (frontend) — deployed backend API URL.
- `PHILSMS_API_TOKEN` / `PHILSMS_SENDER_ID` — SMS provider credentials.

## Deployment

The backend deploys to [Railway](https://railway.com) (PHP + MySQL), and the frontend to [Vercel](https://vercel.com). The backend's task scheduler (subscriber status recalculation, payment-due reminders) runs via `php artisan schedule:run` and needs a recurring trigger configured on whatever host runs it.
