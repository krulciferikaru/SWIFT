# Billing and payments

## How a subscriber's balance is worked out

Every figure on the Payments page, the subscriber's own dashboard, the reports and the SMS messages comes from one calculation (`BillingService`).

1. **Billing starts the month after the installation date.** The month the subscriber was connected (the installation month) is not billed, because the installation fee is separate. A subscriber connected on 12 March is first billed for April.
2. **Each billing month costs the monthly rate of the plan** the subscriber is on.
3. **All payments are added together and applied to the oldest month first.** A month can be paid in full, partly paid, or unpaid. Any partial amount carries over to the next payment.
4. **Balance** = (number of billed months x monthly rate) minus everything paid. It never shows below zero.
5. **Advance credit** = what the subscriber has paid beyond what is owed so far. It is used automatically for the following months, so a subscriber who pays two or three months ahead simply shows credit until those months arrive.
6. **Months behind** = the number of billed months that are not paid in full. A partly paid month counts as behind.

### Changing a plan, or a plan's price

**A month that has been billed is never re-priced.** Each month is billed at the plan, and the price of that plan, that applied *in that month*. So moving a subscriber from a ₱800 plan to a ₱1,300 plan, or raising a plan's price, changes what is billed **from then on**, not the months already billed.

- **A subscriber's plan is never edited.** Moving to another plan is a request: staff with the *Change a subscriber's plan* permission (admins and secretaries by default, not collectors) press **Change plan** on the Subscribers page and pick the new plan, with an optional reason. The subscriber stays **Active**, and the Edit window shows the plan as read-only.
- **A waiting time of 24 to 48 hours** (`PLAN_CHANGE_HOURS`, default 48) applies. Staff can **cancel** the request any time before it is confirmed; once the change has been carried out, staff **confirm** it. If it was already carried out before the waiting time is over, staff can **confirm it early** (the screen asks "is it really done?", and the Audit Trail notes it was early).
- **Rules.** The subscriber must be fully paid up and not disconnected, with no other change waiting; the new plan must be active and different from the current one.
- **When the new price starts.** With the first bill (statement) after the confirmation: confirmed before the 16th, the **next month's** bill is the first at the new price; confirmed on or after the 16th, the month after. Bills already issued keep their price, and there is no proration.
- The subscriber is texted when a change is requested and when it is confirmed (best effort) and sees the waiting change on their account page. The Audit Trail records the request, the confirmation and any cancellation.
- **A plan's price change** (Service Plans, Edit) asks for confirmation first and starts with the first statement after it, by the same rule.
- After a plan change the subscriber's **status is worked out again**.
- The Billing Breakdown on the Payments page shows each month at the price it was billed at.
- **Limit:** plan and price changes made *before* this was introduced were not recorded, so existing months are priced as they are today. If one of them is wrong, edit the subscriber's plan and choose an earlier month in *The new plan applies from* to put it right.
- Which plan a subscriber was on, and what each plan cost, are remembered from now on in `subscriber_plan_history` and `plan_rate_history`.

### Status

| Months behind | Status |
|---|---|
| 0 | **Active** |
| 1 or 2 | **Unpaid** |
| 3 or more | **Disconnected** |

- The status is recalculated whenever a payment is recorded and once a day by the scheduled job ([Automated jobs and SMS](automation.md)).
- **A Disconnected subscriber is never reconnected automatically**, even after paying. Staff do it by hand with **Reconnect Subscriber** on the Payments page, which appears once the balance is paid, and only after the service has really been reconnected.
- Staff can also set a status by hand on the Subscribers page. That sends the subscriber an SMS.

### Status history

Every time a subscriber's service status changes, a line is kept: what it became, what it was, **when**, and whether **staff** set it, the system worked it out **automatically** from the payments, or it came from approving or adding the subscriber. Lines are only ever added, never changed.

- **Staff** see it in the subscriber's details window (*Service history*), with who made each change.
- **The subscriber** sees their own on their page (*Service History*), without staff names, because they have a right to it.
- The history shows the **installation date** and how long the current status has lasted.
- **It starts on the day it was introduced.** For people who were already subscribers, the first line says "this is where the history begins"; earlier changes were not recorded and cannot be recovered.
- An applicant waiting for approval has no history yet; their first line is added when they are approved.

### What the subscriber sees

The top of the subscriber's account page says it in plain words: **active** (nothing owed, any advance credit, next bill date), **payment needed** (how much is owed, the number of unpaid months, and that 3 unpaid months means disconnection) or **disconnected** (pay the balance, then contact the company to be reconnected). The same page shows the amount owed, the monthly bill, the month-by-month breakdown, the payment history and the company's contact details and how to pay.

### Statement and due dates

Everyone shares one calendar, in Philippine time. The bill for a month is issued **in advance, on the 16th of the month before** (`BILLING_STATEMENT_DAY`, default 16) and is **due on the last day of that month before**, so November's bill comes out on 16 October and is due on 31 October. It counts as unpaid from the 1st. Optionally `BILLING_GRACE_DAYS` (default 0) holds back "behind" for that many days after the 1st. The due-date reminder is sent the day before the last day of the month to anyone whose next bill is unpaid. Collectors go out on any day from Monday to Saturday with no fixed time; the window between the statement and the due date is when payments are collected. A subscriber is still **Disconnected at 3 or more months behind**. The subscriber's own page shows the statement date, which month it covers and the **next due date**.

## Recording a payment

Only admins and secretaries record payments (Payments page, search the subscriber, then Record Payment). Before anything is saved, a **review window** repeats the subscriber, the amount (in large type), the date, the OR number, the method and any notes, and warns when the amount is more than two months above what the subscriber owes. The payment is saved only after the person confirms; they can go back and edit instead. A payment needs:

| Field | Rule |
|---|---|
| Amount | More than zero |
| OR number | The official receipt number, required |
| Payment date | Required |
| Method | One of the payment methods an admin has switched on (Settings, Payment methods). Cash, GCash and Others exist to start with |
| Notes | Optional |

The system also remembers which staff account recorded it. After saving, the balance and status are recalculated and the subscriber receives an SMS with the amount, the OR number and the remaining balance.

### Payment methods

An admin manages the list in **Settings, Payment methods**: add a method (for example Bank transfer or Maya), rename one, switch one off, or delete one that no payment uses. Renaming a method also renames the payments already recorded under it, so history and reports stay consistent. A method that has been used cannot be deleted, only switched off; switching off hides it from the form but old payments keep showing it. At least one method must stay on. Every change is written to the audit trail.

### History and receipts

Every subscriber has a payment history (newest first, with a year filter and the total paid), shown to them on their account page and to staff on the Payments page. Each payment has a **Receipt** button that opens a printable "Payment Receipt" with the company, amount, OR number, who it is for, plan, date, method, notes and who received it. It is generated from the recorded payment and is **not** a BIR-registered official receipt.

> **Payments are never edited or deleted.** A payment is sensitive, so a recorded one is never changed. If one was entered wrongly (an extra zero, the wrong date, the wrong subscriber), an **administrator cancels it** and then the correct payment is recorded as a new one. See the next section.

### Correcting a mistake: cancelling a payment

On the Payments page, an administrator sees a **Cancel** button on each payment in the history. It asks for:

- a **reason** (required, at least a few words, for example "Typed 5000 instead of 500"), and
- the administrator's **own password**, like other sensitive actions.

What happens:

- The payment **stays in the history**, struck through and marked **Cancelled**, with who cancelled it, when, and why. Its amount and OR number are untouched. Nothing is deleted or rewritten.
- It **stops counting at once** towards the subscriber's balance, the Collection Report, the dashboard totals and the "total paid" line. The subscriber's service status is worked out again (a subscriber who was Active because of the wrong payment becomes Unpaid, and so on). A subscriber who was already marked Disconnected stays so, as always, until staff reconnect them.
- The cancellation is written to the **audit trail** ("Cancelled a payment").
- The window offers to **fill in the payment form with the old details**, so the person corrects only what was wrong. The same OR number can be used again, because it is the same paper receipt.
- A cancelled payment cannot be cancelled again, and cannot be un-cancelled: if it was cancelled by mistake, record it again.
- The subscriber sees the cancelled payment in their own history, marked as cancelled. **No text message is sent** when a payment is cancelled, so if the wrong amount was already texted to them, tell them.
- Only administrators can cancel payments. Secretaries cannot, and this cannot be granted.

## What the system does not do

These are handled by the company, not by the system. Settle the exact steps with the company and write them here.

| Topic | Today |
|---|---|
| **Collecting money** | Cash with the secretary, or by the field collectors visiting households, or GCash to the company. The system only records what was collected. |
| **Online payment by the subscriber** | Not available. GCash, InstaPay and QR Ph integration was raised as a possible future phase (see [Future improvements](future-improvements.md)). The system shows the subscriber how to pay, in words an admin writes in Settings. |
| **Advance payment** (paying two or three months at once) | The subscriber arranges it with the secretary or administrator. The secretary records one payment for the full amount, and the system carries the credit forward automatically. |
| **Refunds of extra payments** | Not handled by the system. A subscriber asks the company, which pays it back in cash or GCash. **To confirm:** who approves a refund and how it is noted on the records, since the app cannot change a recorded payment. |
| **Disconnection and warnings** | The system changes the status and texts the subscriber. The field collectors give the personal warning before a physical disconnection. **To confirm** the company's own rule, since the system uses three months behind. |
| **Account activation** | A subscriber registers, then a secretary or admin approves. Subscribers contact the company when they apply for service. |

See the [flowcharts](flowcharts.md) for these steps as diagrams.
