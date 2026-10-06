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

- **Admin** can do everything.
- **Secretary** can do everything an admin can **except** manage accounts (Manage Roles).
- **Subscriber** can only see their own account and the plan list. Subscribers never see other people's records.

## Things to know

- **No finer control yet.** Permissions are by role, not per module. A secretary cannot be given "view only" on Reports, for example. Module-level View / Edit / Delete permissions were recommended by an evaluator and would need new development.
- **Permanent deletion is allowed for secretaries too.** Deleting from the Archive page removes a subscriber together with their payment history and login, and cannot be undone.
- **Archived subscribers cannot log in** until they are restored.
- **Inactive accounts cannot log in.** Staff accounts are set Pending, Active or Inactive by an admin. A new self-registered subscriber stays Pending until approved.
- **Passwords:** there is no "forgot password" feature. An admin resets it from Manage Roles.
- **Staff accounts** are created by an admin (as secretaries). The first admin is created with `php artisan swift:create-admin`, see [Deployment and releases](deployment.md).
