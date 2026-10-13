# Features added after the first evaluation

Everything on this page was added in response to the evaluators' feedback or the chair panel's suggestions. The first column says what it is and where to find it.

## Accounts, sign-in and security

| Feature | What it does |
|---|---|
| **Sign-in page** | A split layout: a plain blue panel with the system's full name (Subscriber and Web-based Information and Financial Tracking System), the branch and the company's contact details, and a roomy form. On a phone the panel becomes a short header. "Can't sign in?" opens a short help list. The register page uses the same layout. |
| **Wrong passwords** | A wrong password shows a message without reloading the page. After **5 wrong passwords inside 15 minutes** for one account, sign-in for it pauses and the page counts down. From 2 attempts left it warns. See [Offline behaviour and errors](offline-and-errors.md). |
| **Keep me signed in** | Ticking it keeps the sign-in for **30 days** on that device; otherwise the sign-in ends when the browser closes or after **12 hours**. Expired sign-ins are cleaned out daily. |
| **Show / Hide password** | A visible button with the word, on sign-in, register and the confirmation window. |
| **Confirm your password** | Changing permissions, resetting a password, and deleting from the Archive for good ask an admin (or secretary) to retype their own password. It stays confirmed for **10 minutes**. |
| **Mobile number verification** | After registering, a person confirms their number with a 6-digit text code (10 minutes, 5 tries, one code a minute). Changing the number clears it. Staff see a green **Verified** tag. SMS is disabled on the evaluation site, so codes only arrive on production. |
| **Audit trail** | Admin-only record of who did what and when: sign-ins and failed sign-ins, lockouts, edits (old and new values), archiving and deletion, approvals, payments, permission changes, password resets and confirmations that failed, company information and payment-method changes, texts sent. Searchable by person, kind of activity and date. Entries cannot be edited or deleted from the system, and passwords are never recorded. |
| **Per-secretary permissions** | Ten tasks an admin can switch on or off for each secretary. See [Roles and permissions](roles-and-permissions.md). |

## For the subscriber

| Feature | What it does |
|---|---|
| **Account status box** | At the top of My Account, in plain words and with an icon as well as colour: *Your service is active* (nothing owed, advance credit, next bill date), *Payment needed* (how much, how many unpaid months, that 3 months means disconnection) or *Your service is disconnected* (pay the balance, then contact the company to be reconnected). |
| **Plainer labels** | "Your monthly bill", "Amount you owe", "Unpaid months". Unpaid months are shown in red with the word. |
| **Text size** | Normal, Large or Extra large, at the top of My Account and in Settings. It scales the whole app and is remembered on the device. |
| **Review before saving** | Recording a payment first shows a window that repeats what was typed, with the amount in large type, and warns when the amount is far above what the subscriber owes (for example an extra zero). Changing a plan's monthly rate asks for the same kind of confirmation, showing the old and new rate. |
| **Payment history and receipts** | A full history with a year filter and total paid. Each payment has a **Receipt** button: a printable page titled "Payment Receipt" (company, amount, OR number, who it is for, plan, date, method, notes, who received it). It is not a BIR-registered official receipt. Staff see the same history on the Payments page. |
| **Contact the company** | A card with the mobile, telephone, email, office address, office hours and how to pay, with tap-to-call and email links. The sign-in and register pages show it too. It appears once an admin has filled it in. |

## For staff and admins

| Feature | What it does |
|---|---|
| **Dashboard Activity filter** | **Today, This month, This quarter, This year or All time**: money collected, payments recorded and new subscribers, each compared with the period before. Periods follow Philippine time. The Active / Unpaid / Disconnected counts sit under "Right now" because the system keeps no history of statuses, so they cannot be shown for a past period. |
| **Reports** | One report, the **Collection Report**, by month, last 3 months, year or a **date range** (up to 5 years). **Filters** narrow it before reading or downloading: subscriber, service plan, payment method, part of an OR number. The PDF and Excel files follow the filters and say which were used. (The Financial Statement report was removed.) |
| **Payment methods** | Settings, Payment methods (admin): add, rename, switch off or delete the choices staff see when recording a payment. Cash, GCash and Others exist to start with. Renaming also renames recorded payments, a used method can be switched off but not deleted, and at least one must stay on. |
| **Company contact information** | Settings (admin): the contact details above. |
| **Archive** | Archived subscribers and plans can be restored or permanently deleted. An archived subscriber cannot sign in until restored. |
| **Details windows** | Click a subscriber's or plan's name (shown as a blue link with an arrow) to see everything in one window with the same Edit, Archive and Payments buttons. Edit, Archive, Restore, Approve and Reject are real buttons with icons. |
| **Address and names** | Addresses are chosen from a list of barangays (see [Future improvements](future-improvements.md) for the list's limits). Names are capitalised automatically. The MAC address fills in its colons as you type. |

## Using SWIFT

| Feature | What it does |
|---|---|
| **Grouped menu** | The sidebar is split into sections (Overview, Customers, Billing, Administration) with Settings and the Guide at the bottom. A section only shows if you have a page in it. Collapsed, it shows icons with dividers; on a phone it becomes a top menu with the same sections. |
| **Tables on phones** | Below 768 pixels wide, lists show one card per row with the column title beside each value. Report tables keep horizontal scrolling. |
| **Guide and tours** | A searchable, printable guide with a section for each role, and step-by-step guided tours of every page and form (Driver.js). Tours skip steps for things a person cannot see. |
| **Offline and errors** | A banner, forms that keep what was typed, lists that reload by themselves, and clear messages. See [Offline behaviour and errors](offline-and-errors.md). |
| **Loading placeholders** | Grey shapes that match each page's layout while it loads. |
| **Accessibility** | Labels and live regions for screen readers, keyboard access, a skip link, and a clean automated accessibility check in light and dark. |
| **Older computers** | Styling compiled for older browsers such as Chrome 109 on Windows 7. |
