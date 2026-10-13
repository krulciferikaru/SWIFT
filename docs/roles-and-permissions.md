# Roles and permissions

There are three roles. A person's role is fixed when their account is created and **cannot be changed afterwards**. The rules are enforced by the backend, not just hidden in the interface.

| Capability | Admin | Secretary | Subscriber |
|---|:---:|:---:|:---:|
| See their own account status, balance, months behind, payment history and receipts | | | yes |
| Verify their mobile number, change the text size, see the company's contact details | | | yes |
| See the service plans | yes | yes | yes |
| Dashboard with the Activity filter, subscriber counts and collections | yes | yes | |
| Subscribers: list, search, add, edit, archive, change status | yes | yes | |
| Approve or reject new applications and account claims | yes | yes | |
| Payments: view a subscriber's billing, record a payment, reconnect | yes | yes | |
| Service plans: add, edit, archive | yes | yes | |
| Archive: restore or permanently delete subscribers and plans | yes | yes | |
| Reports: view the Collection Report with filters, and download PDF / Excel / CSV | yes | yes | |
| Send an SMS or payment reminders (Settings) | yes | yes | |
| **Manage Roles:** create staff accounts, set account status, reset passwords, set each secretary's permissions | **yes** | | |
| **Audit Trail:** see who did what and when | **yes** | | |
| **Settings:** edit the payment methods and the company contact information | **yes** | | |
| Settings: dark mode, text size, logout confirmation, tour options | yes | yes | yes |

## In short

- **Admin** can do everything, including Manage Roles, the Audit Trail, the payment methods and the company contact information.
- **Secretary** can do everything an admin can **except** those admin-only items, unless an admin switches individual abilities off (see below).
- **Subscriber** can only see their own account and the plan list. Subscribers never see other people's records.

## Per-secretary permissions

On **Manage Roles** (opened from Settings), each secretary has a **Permissions** button. The admin ticks exactly which of these tasks that secretary may do:

| Permission | Lets them |
|---|---|
| View subscribers | See the subscriber list and each subscriber's details |
| Add and edit subscribers | Add subscribers, edit details, change status |
| Archive subscribers | Move subscribers to the Archive |
| Approve registrations | Approve or reject new registrations and account claims |
| Manage service plans | Add, edit and archive plans |
| View payments | Open Payments and see payment history and balances |
| Record payments | Enter a payment received |
| View and export reports | Open Reports and download PDF, Excel or CSV |
| Use the Archive | See archived records, restore them, or delete them permanently |
| Send text messages | Send payment reminders and other texts |

- A secretary who has never been customised keeps **all** of these, which is how the system worked before permissions existed. **Reset to default** gives everything back.
- Pages and buttons a secretary is not allowed to use are hidden for them, and the server also refuses the request. The dashboard shows only the cards they may see.
- **Manage Roles**, the **Audit Trail**, the **payment methods** and the **company contact information** are admin-only and can never be granted. Admins cannot be restricted.
- Every change to someone's permissions is written to the [Audit Trail](features.md#accounts-sign-in-and-security).

## Sensitive actions ask for the password again

Even though they are already signed in, a person must **retype their own password** before:

- changing what a secretary is allowed to do (Permissions),
- resetting someone's password (Manage Roles),
- permanently deleting a subscriber or a plan from the Archive.

A "Confirm your password" window opens, the action carries on by itself once the password is right, and it stays confirmed for **10 minutes** for that sign-in. This protects against an unattended screen or a stolen sign-in. Someone who is not allowed to do the action is refused outright and is not asked for a password. A wrong password is written to the Audit Trail.

## Signing in

- Subscribers sign in with their mobile number or email; staff with their email.
- **Five wrong passwords inside 15 minutes** pauses sign-in for that account (15 minutes at most), with a countdown on the page.
- A normal sign-in ends when the browser closes or after **1 hour**. Ticking **Keep me signed in** lasts **7 days** on that device.
- See [Offline behaviour and errors](offline-and-errors.md) for the details.

## Things to know

- **Finer than on/off per task is not available.** Permissions are switches per task, not separate View / Edit / Delete levels inside every module.
- **Permanent deletion is allowed for secretaries too** (unless switched off), and asks them for their password. Deleting from the Archive page removes a subscriber together with their payment history and login, and cannot be undone.
- **Archived subscribers cannot log in** until they are restored.
- **Inactive accounts cannot log in.** Staff accounts are set Pending, Active or Inactive by an admin. A new self-registered subscriber stays Pending until approved.
- **Passwords:** there is no "forgot password" feature yet; it is built but held back (see [Future improvements](future-improvements.md)). The office resets it: an admin does it from Manage Roles.
- **Staff accounts** are created by an admin (as secretaries). The first admin is created with `php artisan swift:create-admin`, see [Deployment and releases](deployment.md).
- Demo accounts are never created in production.
