# Roles and permissions

There are three roles. A person's role is fixed when their account is created and **cannot be changed afterwards**. The rules are enforced by the backend, not just hidden in the interface.

| Capability | Admin | Secretary | Subscriber |
|---|:---:|:---:|:---:|
| See their own account, balance, months behind and payment history | | | yes |
| See the service plans | yes | yes | yes |
| Dashboard with subscriber counts and collections | yes | yes | |
| Subscribers: list, search, add, edit, archive, change status | yes | yes | |
| Approve or reject new applications and account claims | yes | yes | |
| Payments: view a subscriber's billing, record a payment, reconnect | yes | yes | |
| Service plans: add, edit, archive | yes | yes | |
| Archive: restore or permanently delete subscribers and plans | yes | yes | |
| Reports: view, and download PDF / Excel / CSV | yes | yes | |
| Send an SMS or payment reminders (Settings) | yes | yes | |
| **Manage Roles:** create staff accounts, set account status, reset passwords | **yes** | | |
| Settings: dark mode, logout confirmation, tour options | yes | yes | yes |

## In short

- **Admin** can do everything, including Manage Roles and the Audit Trail.
- **Secretary** can do everything an admin can **except** Manage Roles and the Audit Trail, unless an admin switches individual abilities off (see below).
- **Subscriber** can only see their own account and the plan list. Subscribers never see other people's records.

## Per-secretary permissions

On **Manage Roles**, each secretary has a **Permissions** button. The admin ticks exactly which of these tasks that secretary may do:

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
- Pages and buttons a secretary is not allowed to use are hidden for them, and the server also refuses the request.
- **Manage Roles** and **Audit Trail** are admin-only and can never be granted. Admins cannot be restricted.
- Every change to someone's permissions is written to the [Audit Trail](features.md#audit-trail).

## Things to know

- **Finer than on/off per task is not available.** Permissions are switches per task, not separate View / Edit / Delete levels inside every module.
- **Permanent deletion is allowed for secretaries too.** Deleting from the Archive page removes a subscriber together with their payment history and login, and cannot be undone.
- **Archived subscribers cannot log in** until they are restored.
- **Inactive accounts cannot log in.** Staff accounts are set Pending, Active or Inactive by an admin. A new self-registered subscriber stays Pending until approved.
- **Passwords:** there is no "forgot password" feature. An admin resets it from Manage Roles.
- **Staff accounts** are created by an admin (as secretaries). The first admin is created with `php artisan swift:create-admin`, see [Deployment and releases](deployment.md).
