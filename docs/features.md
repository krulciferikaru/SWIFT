# Features added after the first evaluation

## Audit trail

An admin-only page (**Audit Trail**) that records who did what, and when.

- **Recorded:** sign-ins and failed sign-ins; adding, editing, archiving, restoring and permanently deleting subscribers and plans; approving or rejecting registrations and account claims; payments recorded; creating staff accounts, changing account status, resetting passwords and changing permissions; text messages and payment reminders sent; phone numbers verified.
- **Edits** show what changed, with the old value beside the new one.
- **Search and filters:** by person or record name, by kind of activity, and by date range.
- **Cannot be changed:** the app has no way to edit or delete entries. Names are stored as text, so the history still reads correctly after a person or record is removed.
- **Passwords are never recorded.** A failure to write a log entry never blocks the action itself.

## Phone verification

After registering, a person can confirm their mobile number.

1. A "Verify your mobile number" banner shows on the subscriber dashboard, and Settings has a Mobile number row.
2. They click Verify and a 6-digit code is texted to the number.
3. They type the code. The number is then marked **Verified**.

Staff see a green **Verified** tag next to the contact number in the Subscribers list and details window. The tag only shows while the verified number is still the number on the subscriber's record.

- Codes are stored hashed, expire after **10 minutes**, and allow **5 wrong tries**.
- A new code can be requested after 60 seconds, with at most 3 texts per 10 minutes (each costs an SMS).
- Changing the number on the account clears the verification.
- Unverified numbers still receive notices. Registration is unchanged: staff still approve each one.
- SMS is disabled on the evaluation site, so codes only arrive on production.

## Payment history and receipts

- A subscriber sees their full payment history on their dashboard. Staff see the same list on the Payments page for the selected subscriber. It shows the newest first, a year filter, the number of payments and the total paid.
- Every payment has a **Receipt** button. The window shows the company, amount, receipt / OR number, who it is for, plan, date, method, notes and who received it, with **Print receipt**.
- The printout is a plain black-on-white page, the same in light and dark theme.
- It is titled **Payment Receipt**. It is generated from the recorded payment and is not a BIR-registered official receipt.

## Tables on phones

Below 768 pixels wide, the lists (Subscribers, Service Plans, Approvals, Manage Roles, Archive, Audit Trail) show one card per row with the column title beside each value, instead of scrolling sideways. Report tables keep horizontal scrolling because they are wide.

## MAC address field

Typing or pasting a MAC address fills in the colons automatically (`aabbccddeeff` becomes `AA:BB:CC:DD:EE:FF`).
