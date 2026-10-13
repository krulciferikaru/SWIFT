# Privacy Policy and Terms of Service

The system has a **Privacy Policy** (`/privacy`) and **Terms of Service** (`/terms`). They are public pages, so they can be read before registering, and they are linked from the sign-in and register pages and from Settings.

## They are drafts until the company reviews them

The wording was prepared against the Data Privacy Act of 2012 (Republic Act No. 10173) and with similar service providers' notices in mind, **but it is not legal advice and the company has not approved it**. Every item the company has to decide is shown in the page itself as a highlighted **[bracketed]** placeholder, and a yellow "Draft for review" banner is shown at the top of both pages.

Before real subscribers use the system, the company (with its Data Protection Officer) should:

1. **Read both pages** and correct anything that is not true of how the company works.
2. **Fill in every [bracketed] item.** At the time of writing they are:
   - the name and email of the **Data Protection Officer**;
   - any other provider, or any storage outside the Philippines, that must be listed;
   - how long **billing and payment records** are kept (normally set by tax and accounting rules; ask the company's accountant);
   - how long the **audit trail** is kept;
   - whether and when an **inactive account** is deleted (the Data Privacy Division suggested one year);
   - how many days the company takes to answer a request about someone's information;
   - how a change of plan or rate takes effect, any reconnection fee, any limit on the company's responsibility, the place where disputes are settled, and which mobile networks text messages reach.
3. In the code, set `LEGAL_DRAFT` to `false` and change `LEGAL_VERSION` in `Frontend/src/legal/meta.js` (this removes the banner and gives the new wording its own version), and set the same version in the server's `LEGAL_VERSION` setting (`Backend/config/legal.php`).

The wording lives in `Frontend/src/pages/PrivacyPolicy.jsx` and `Frontend/src/pages/Terms.jsx`.

## Agreeing when registering

The register page has a required box: *I have read and agree to the Terms of Service and the Privacy Policy*, with both pages one click away (they open in a new tab so nothing typed is lost). The server refuses a registration without it. It records **when** the person agreed and **which version** (`terms_accepted_at`, `terms_version`), first on the subscriber record and then on their login once approved, so the company can tell who agreed to which wording. People who registered before this existed have no recorded agreement.

## What the policy promises (so the system has to keep doing it)

- Nobody, including administrators, can see or reset another person's password (see [Roles and permissions](roles-and-permissions.md)).
- A person can delete their own account in Settings; their login and contact details go, and billing records are kept for the retention period. (Delete my account is added in a following change.)
- Verification and reset codes last ten minutes and are stored scrambled.
- No advertising or tracking cookies.
