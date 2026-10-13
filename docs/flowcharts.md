# Flowcharts

These diagrams are written in Mermaid, so GitHub draws them when you open this page. To use one in a paper, open the page on GitHub and take a screenshot, or paste the diagram code into <https://mermaid.live> and export it as an image or SVG.

Boxes marked **company process** are done by people, not by the system. Wording of those steps should be confirmed with the company.

## 1. Registration and activation

A person registers with a name, mobile number, address (chosen from the barangay list) and password (email is optional). What happens next depends on whether the mobile number is already on file.

```mermaid
flowchart TD
  A["Person registers<br/>name, mobile number, barangay, password"] --> B{"Is the mobile number<br/>already a subscriber on file?"}

  B -- "No" --> C["New subscriber record<br/>status: Pending"]
  C --> D["Staff review it in<br/>Pending Approvals"]
  D -- "Approve" --> D2["Staff choose the service plan<br/>and the installation date"]
  D2 --> E["Status worked out from them.<br/>Login created and Active<br/>SMS: application approved"]
  D -- "Reject" --> F["Marked Rejected<br/>SMS: not approved"]
  F -. "can be re-approved<br/>from the Rejected tab" .-> D

  B -- "Yes" --> G{"Does that subscriber<br/>already have a login?"}
  G -- "Yes" --> H["Registration refused:<br/>contact the company"]
  G -- "No" --> I["Pending login linked to the<br/>existing subscriber<br/>(an Account Claim)"]
  I --> J["Staff compare the name, address and<br/>mobile number with their records"]
  J -- "Approve" --> K["Login Active and linked to the<br/>subscriber's billing history"]
  J -- "Reject" --> L["Login Inactive, kept under<br/>Rejected Claims"]
```

## 2. Recording a payment

```mermaid
flowchart TD
  A["Subscriber pays<br/>cash, field collector or GCash<br/>(company process)"] --> B["Secretary finds the subscriber<br/>on the Payments page"]
  B --> C["Enters amount, OR number,<br/>date and payment method"]
  C --> D["Payment saved with the staff<br/>account that recorded it"]
  D --> E["Applied to the oldest unpaid month first<br/>anything extra becomes advance credit"]
  E --> F["Status recalculated"]
  F --> G["SMS to the subscriber:<br/>payment received and remaining balance"]
  F --> H{"Was Disconnected and<br/>now fully paid?"}
  H -- "Yes" --> I["Staff reconnect the service,<br/>then press Reconnect Subscriber"]
  H -- "No" --> J["Done"]
```

## 3. Subscriber status

```mermaid
stateDiagram-v2
  [*] --> Active: connected, payments up to date
  Active --> Unpaid: 1 or 2 months behind
  Unpaid --> Active: balance paid
  Unpaid --> Disconnected: 3 or more months behind
  Disconnected --> Active: staff press Reconnect after full payment
```

Statuses are recalculated by the system. Only a staff member can take a subscriber out of Disconnected.

## 4. Due date, overdue accounts, notification and disconnection

```mermaid
flowchart TD
  A["Due day = the day of the month<br/>the subscriber was connected"] --> B["Day before: the daily job texts<br/>'your bill is due tomorrow'<br/>if that month is not yet paid"]
  B --> C{"Paid?"}
  C -- "Yes" --> D["Stays Active"]
  C -- "No" --> E["Month counts as unpaid:<br/>status becomes Unpaid<br/>(daily job, no SMS)"]
  E --> F["Staff can send reminders to all<br/>Unpaid subscribers from Settings.<br/>Field collectors visit and collect<br/>(company process)"]
  F --> G{"Still unpaid after<br/>3 months?"}
  G -- "No, pays" --> D
  G -- "Yes" --> H["Status becomes Disconnected<br/>(daily job, no SMS)"]
  H --> I["Field collector warns the subscriber and<br/>the line is disconnected<br/>(company process, to confirm)"]
  I --> J["Subscriber settles the balance"]
  J --> K["Staff reconnect the line and<br/>press Reconnect Subscriber:<br/>status Active"]
```

## 5. Advance payment and refund

```mermaid
flowchart TD
  subgraph ADV["Advance payment"]
    A1["Subscriber asks the secretary or<br/>administrator to pay 2 or 3 months ahead<br/>(company process)"] --> A2["Subscriber pays the total"]
    A2 --> A3["Secretary records one payment<br/>for the full amount"]
    A3 --> A4["System shows advance credit and uses<br/>it for each following month"]
  end

  subgraph REF["Refund of an extra payment (company process, to confirm)"]
    R1["Subscriber asks the company"] --> R2["Company decides and approves<br/>who approves?"]
    R2 --> R3["Refund paid in cash or GCash<br/>outside the system"]
    R3 --> R4["Noted in company records<br/>the app cannot edit a recorded payment"]
  end
```

## 6. How a change reaches production

```mermaid
flowchart LR
  A["Feature branch"] -->|"Pull request"| B["development"]
  B --> C["Required checks:<br/>base branch guard,<br/>frontend build, backend tests"]
  C --> D["Evaluation site<br/>test here"]
  D -->|"Release pull request"| E["master"]
  E --> F["Production"]
```

Details and the release checklist are in [Deployment and releases](deployment.md).

## 7. Signing in

Wrong passwords are counted per account, so the pause cannot be avoided by trying from other places.

```mermaid
flowchart TD
  A["Person enters mobile number or email and password"] --> B{"Is sign-in for this account paused?<br/>(5 wrong passwords in 15 minutes)"}
  B -- "Yes" --> C["The page counts down and the button<br/>is disabled. It unlocks by itself"]
  C -. "countdown ends" .-> A
  B -- "No" --> D{"Password correct?"}
  D -- "No" --> E["Message shown, password cleared.<br/>From 2 attempts left: a warning.<br/>The 5th wrong one pauses sign-in"]
  E --> A
  D -- "Yes" --> F{"Account active and not archived?"}
  F -- "No" --> G["Message: awaiting approval, rejected,<br/>deactivated or not available"]
  F -- "Yes" --> H{"Keep me signed in ticked?"}
  H -- "Yes" --> I["Signed in for 7 days on this device"]
  H -- "No" --> J["Signed in until the browser closes<br/>or an hour after the last use,<br/>kept alive while the page is open"]
```

## 8. A sensitive action asks for the password again

Changing permissions and permanently deleting from the Archive.

```mermaid
flowchart TD
  A["Admin presses Save on permissions<br/>or Delete in the Archive"] --> B{"Allowed to do this?<br/>(permission check)"}
  B -- "No" --> C["Refused. No password is asked for"]
  B -- "Yes" --> D{"Password confirmed in the last<br/>10 minutes on this sign-in?"}
  D -- "Yes" --> E["The action is carried out"]
  D -- "No" --> F["Window: Confirm your password"]
  F -- "Cancel" --> G["Nothing changes"]
  F -- "Wrong password" --> H["Message, and a line in the audit trail"]
  H --> F
  F -- "Correct password" --> I["Confirmed for 10 minutes"]
  I --> E
```

## 9. Verifying a mobile number

```mermaid
flowchart TD
  A["Person presses Verify on My Account<br/>or in Settings"] --> B["A 6-digit code is texted to their number<br/>(one a minute, three every 10 minutes)"]
  B --> C["Person types the code"]
  C --> D{"Correct, within 10 minutes,<br/>fewer than 5 wrong tries?"}
  D -- "Yes" --> E["Number marked Verified<br/>(green tag for staff, line in the audit trail)"]
  D -- "No" --> F["Message. Ask for a new code"]
  F --> B
  E --> G["If the number is changed later,<br/>the verification is cleared"]
```

## Forgot password

Nobody else can reset a password, so this is the only way back in. The page says the same thing whether or not the number belongs to an account.

```mermaid
flowchart TD
  A["Person opens Forgot password?<br/>and types their mobile number"] --> B["Page: 'If that number belongs to an account<br/>with a verified mobile number, we sent a code'"]
  B --> C{"Active account with a<br/>verified number?<br/>(not shown to the person)"}
  C -- "No" --> D["Nothing is sent"]
  C -- "Yes" --> E["6-digit code texted<br/>(one a minute, three every 10 minutes per number)"]
  E --> F["Person types the code and a new password"]
  F --> G{"Right code, within 10 minutes,<br/>fewer than 5 wrong tries?"}
  G -- "No" --> H["'That code is not correct or has expired'<br/>Ask for a new one"]
  G -- "Yes" --> I["Password changed. Signed out everywhere.<br/>A 'your password was changed' text is sent"]
```
