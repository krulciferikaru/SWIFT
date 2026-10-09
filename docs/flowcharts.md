# Flowcharts

These diagrams are written in Mermaid, so GitHub draws them when you open this page. To use one in a paper, open the page on GitHub and take a screenshot, or paste the diagram code into <https://mermaid.live> and export it as an image or SVG.

Boxes marked **company process** are done by people, not by the system. Wording of those steps should be confirmed with the company.

## 1. Registration and activation

A person registers with a name, contact number and password (email is optional). What happens next depends on whether the contact number is already on file.

```mermaid
flowchart TD
  A["Person registers<br/>name, contact number, password"] --> B{"Is the contact number<br/>already a subscriber on file?"}

  B -- "No" --> C["New subscriber record<br/>status: Pending"]
  C --> D["Staff review it in<br/>Pending Approvals"]
  D -- "Approve" --> E["Login created and Active<br/>SMS: application approved"]
  D -- "Reject" --> F["Marked Rejected<br/>SMS: not approved"]
  F -. "can be re-approved<br/>from the Rejected tab" .-> D

  B -- "Yes" --> G{"Does that subscriber<br/>already have a login?"}
  G -- "Yes" --> H["Registration refused:<br/>contact the company"]
  G -- "No" --> I["Pending login linked to the<br/>existing subscriber<br/>(an Account Claim)"]
  I --> J["Staff compare the name, address and<br/>contact number with their records"]
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
