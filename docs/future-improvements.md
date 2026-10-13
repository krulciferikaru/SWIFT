# Future improvements

Ideas raised during the evaluations that are **not built yet**, or that were built and deliberately held back. They are here so they are not lost.

## Held back on purpose

| Idea | Why it is not in the system yet |
|---|---|
| **Privacy Policy and Terms of Service** | The system holds personal data (names, mobile numbers, addresses, payment records), so a privacy notice under the Data Privacy Act is expected before real subscribers use it. The wording has to come from, or be reviewed by, the company, so it was not written into the system. The sign-in and register pages are where it would be linked, with an "I agree" box at registration. |
| **Secure cookies instead of a stored token** | The sign-in token is kept in the browser. Cookies are safer but need the website and the server on the **same domain** (for example `app.example.com` and `api.example.com`), or the website to forward API calls itself. Today the website (Vercel) and the server (Railway) are on different domains. The risk is reduced meanwhile: tokens now expire (an hour after last use, or 7 days when "Keep me signed in" is ticked) and are removed on logout. |
| **Two-step sign-in for secretaries and subscribers** | Built for administrators (authenticator app, required). It is not asked of secretaries or subscribers; it could be offered to them as an option. |
| **Email verification at registration** | Suggested by evaluators. A mobile-number code was built instead, since the mobile number is how subscribers sign in. Email is optional today, and the system has no email service. |

## Not started

| Idea | Notes |
|---|---|
| **Email reminders before the due date** | Reminders go out by SMS (see [Automated jobs and SMS](automation.md)). The same reminder by email needs an email service and each subscriber's email address, which is optional today. |
| **Online payment** (GCash, InstaPay, QR Ph) | Subscribers cannot pay inside the system. Staff record payments after cash or GCash is received. It would also need a way to verify and approve them. |
| **SMS to all mobile networks** | PhilSMS currently reaches Globe numbers only. Other networks need a different provider or plan. This also limits phone verification. |
| **A full, editable barangay list** | Addresses are chosen from a list of five barangays that is written into the code in two places (the server and the website), so changing it needs a developer. The list of Palayan City barangays still has to be agreed, and could then be managed in Settings like payment methods. |
| **Status history** | The system stores each subscriber's status as of now only. Showing Active, Unpaid and Disconnected counts "for last quarter" on the dashboard needs a history table, and would only be accurate from the day it is added. |
| **Per-module View / Edit / Delete levels** | Permissions are switches per task today (ten of them). Separate levels inside every module would be new development. |
| **Financial Statement report** | A report of what each subscriber owes (receivables, paid, outstanding by plan and by subscriber) existed and was removed later at the project team's request. The calculation behind it (`BillingService`) still exists. |
| **Editing or reversing a recorded payment** | Payments cannot be edited or deleted in the app, so a wrong entry is fixed outside it. A reversal that keeps the history would help refunds. |
| **A support and maintenance arrangement** | Raised by an evaluator: who maintains and updates the system after the project. A decision for the company and the team, not code. |
