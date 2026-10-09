# Automated jobs and SMS

## Scheduled jobs

Two jobs are registered in `Backend/routes/console.php`. Both run **daily**.

| Job | Command | What it does |
|---|---|---|
| Status recalculation | `subscribers:recalculate-status` | For every **active** subscriber, recomputes Active / Unpaid / Disconnected from their payment history (rules in [Billing and payments](billing-and-payments.md)). It does **not** send SMS. It never moves anyone out of Disconnected. |
| Due-date reminder | `subscribers:send-due-reminders` | Sends an SMS to every active, non-disconnected subscriber whose monthly bill is **due tomorrow** and not already fully paid. |

### When they run

The application time zone is **UTC**, so "daily" means **00:00 UTC, which is 8:00 AM in the Philippines**. Dates used by the system (for example "today" when a month is billed) follow UTC, so between midnight and 8:00 AM Philippine time the system still thinks it is the previous day. This only matters around the change of a day or month.

### What starts the scheduler

Laravel does not run scheduled jobs by itself. Something must call `php artisan schedule:run` about every minute. The repository does not contain that trigger.

> **To confirm:** how the trigger is set up on the production Railway service (a cron service, or a worker running `php artisan schedule:work`). If it is not running, subscribers are never moved to Unpaid or Disconnected automatically and no due-date reminders go out. A quick check: run `php artisan schedule:list` on the service to see the jobs, and look in the logs after 00:00 UTC for the line "Recalculated status for N subscribers."

## Every SMS the system sends

All SMS go through PhilSMS. If no token is configured (as on evaluation), nothing is sent and a warning is logged.

| When | Message to the subscriber | Triggered by |
|---|---|---|
| A staff member approves an application | "Your subscriber application has been approved. You may now log in." | Pending Approvals, Approve |
| A staff member rejects an application | "Your subscriber application was not approved at this time. Please contact us." | Pending Approvals, Reject |
| A payment is recorded | Amount received, OR number, date and the remaining balance | Payments, Record Payment |
| A staff member changes the status by hand to Active, Unpaid or Disconnected | A message matching the new status | Subscribers, status change |
| The due date is tomorrow | Reminder that the monthly bill is due tomorrow | Daily job |
| Staff send reminders | Reminder with the outstanding balance, to **every Unpaid subscriber** | Settings, Payment Reminders |
| Staff send a one-off message | Any text (up to 300 characters) to any Philippine mobile number | Settings, Send SMS |

Notes:

- The automatic status job changes a status **silently**. A subscriber only receives a status SMS when staff change the status manually.
- Account claims (someone registering with the contact number of an existing subscriber) do not send an SMS when approved or rejected.
- SMS to subscribers are only sent to accounts that have a contact number.

## Known limits

- **Coverage:** PhilSMS currently reaches **Globe** numbers only. Other networks need extra registration with the provider. **To confirm** with PhilSMS whether this is still the case and what is needed.
- **Cost:** each message may use credit on the PhilSMS account.
- **No email notifications:** the system does not send email.
