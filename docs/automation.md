# Automated jobs and SMS

## Scheduled jobs

Three jobs are registered in `Backend/routes/console.php`. All run **daily**.

| Job | Command | What it does |
|---|---|---|
| Status recalculation | `subscribers:recalculate-status` | For every **active** subscriber, recomputes Active / Unpaid / Disconnected from their payment history (rules in [Billing and payments](billing-and-payments.md)). It does **not** send SMS. It never moves anyone out of Disconnected. |
| Due-date reminder | `subscribers:send-due-reminders` | Sends an SMS to every active, non-disconnected subscriber whose monthly bill is **due tomorrow** and not already fully paid. |
| Clean-up of old sign-ins | `sanctum:prune-expired --hours=24` | Deletes sign-in tokens that expired more than a day ago (a sign-in lasts 12 hours, or 30 days if "Keep me signed in" was ticked). It sends no SMS. |

### When they run

The application time zone is **UTC**, so "daily" means **00:00 UTC, which is 8:00 AM in the Philippines**. Billing dates (for example "today" when a month is billed) follow UTC, so between midnight and 8:00 AM Philippine time those calculations still think it is the previous day. This only matters around the change of a day or month.

Two things deliberately use **Philippine time** instead, so they never flip at 8 AM: the dashboard's **Activity** filter (what "today", "this month" and so on mean) and the **next due date** a subscriber sees on their account.

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
| Someone asks to verify their mobile number | A 6-digit code that works for 10 minutes. It is the only message that goes to a number that has not been verified yet | My Account or Settings, Verify |

Notes:

- The automatic status job changes a status **silently**. A subscriber only receives a status SMS when staff change the status manually.
- Account claims (someone registering with the contact number of an existing subscriber) do not send an SMS when approved or rejected.
- SMS to subscribers are only sent to accounts that have a contact number. Unverified numbers still receive notices; verification only proves the number belongs to the person.
- Verification codes are limited (one a minute, three every 10 minutes per person) because each one costs a message, and a code stops working after 5 wrong tries.

## Known limits

- **Coverage:** PhilSMS currently reaches **Globe** numbers only. Other networks need extra registration with the provider. **To confirm** with PhilSMS whether this is still the case and what is needed.
- **Cost:** each message may use credit on the PhilSMS account.
- **No email notifications:** the system does not send email. Email reminders are on the [Future improvements](future-improvements.md) list.
- **Evaluation site:** SMS is switched off there, so verification codes never arrive. Test the code flow on production only.
