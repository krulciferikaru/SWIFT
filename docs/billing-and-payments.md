# Billing and payments

## How a subscriber's balance is worked out

Every figure on the Payments page, the subscriber's own dashboard, the reports and the SMS messages comes from one calculation (`BillingService`).

1. **Billing starts the month after the installation date.** The month the subscriber was connected (the installation month) is not billed, because the installation fee is separate. A subscriber connected on 12 March is first billed for April.
2. **Each billing month costs the monthly rate of the plan** the subscriber is on.
3. **All payments are added together and applied to the oldest month first.** A month can be paid in full, partly paid, or unpaid. Any partial amount carries over to the next payment.
4. **Balance** = (number of billed months x monthly rate) minus everything paid. It never shows below zero.
5. **Advance credit** = what the subscriber has paid beyond what is owed so far. It is used automatically for the following months, so a subscriber who pays two or three months ahead simply shows credit until those months arrive.
6. **Months behind** = the number of billed months that are not paid in full. A partly paid month counts as behind.

### Status

| Months behind | Status |
|---|---|
| 0 | **Active** |
| 1 or 2 | **Unpaid** |
| 3 or more | **Disconnected** |

- The status is recalculated whenever a payment is recorded and once a day by the scheduled job ([Automated jobs and SMS](automation.md)).
- **A Disconnected subscriber is never reconnected automatically**, even after paying. Staff do it by hand with **Reconnect Subscriber** on the Payments page, which appears once the balance is paid, and only after the service has really been reconnected.
- Staff can also set a status by hand on the Subscribers page. That sends the subscriber an SMS.

### What the subscriber sees

The top of the subscriber's account page says it in plain words: **active** (nothing owed, any advance credit, next bill date), **payment needed** (how much is owed, the number of unpaid months, and that 3 unpaid months means disconnection) or **disconnected** (pay the balance, then contact the company to be reconnected). The same page shows the amount owed, the monthly bill, the month-by-month breakdown, the payment history and the company's contact details and how to pay.

### Due day

A subscriber's monthly due day is the **day of the month they were connected**. If the month is shorter (connected on the 31st), the due day is the last day of that month. The due-date reminder is sent the day before. The subscriber's own page shows the **next due date** (in Philippine time), which falls on the last day of a shorter month when needed.

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

> **Payments cannot be edited or deleted in the app.** The system only lists and adds payments. If one was entered wrongly, the correction has to be handled outside the app (for example by a database change by whoever maintains the system). The audit trail records who recorded each payment and when, but it cannot undo one.

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
