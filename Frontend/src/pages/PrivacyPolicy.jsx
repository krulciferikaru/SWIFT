import { Link } from 'react-router-dom'
import LegalLayout, { Section, Todo } from '../legal/LegalLayout.jsx'
import CompanyContact from '../components/CompanyContact.jsx'

const SECTIONS = [
  { id: 'who', title: 'Who we are and what this covers' },
  { id: 'collect', title: 'What we collect' },
  { id: 'why', title: 'Why we use it' },
  { id: 'share', title: 'Who can see it' },
  { id: 'lifecycle', title: 'The life of your information' },
  { id: 'keep', title: 'How long we keep it' },
  { id: 'rights', title: 'Your rights' },
  { id: 'delete', title: 'Deleting your account' },
  { id: 'security', title: 'How we protect it' },
  { id: 'cookies', title: 'Cookies and browser storage' },
  { id: 'contact', title: 'Questions, changes and complaints' },
]

/**
 * The Privacy Policy, written for the Data Privacy Act of 2012 (Republic Act No. 10173). It is a
 * DRAFT until the company has filled in the [bracketed] items and reviewed it (see legal/meta.js).
 */
export default function PrivacyPolicy() {
  return (
    <LegalLayout
      title="Privacy Policy"
      sections={SECTIONS}
      intro="This policy explains what personal information SWIFT collects about you, why, who can see it, how long it is kept, and what you can do about it. It follows the Data Privacy Act of 2012 (Republic Act No. 10173)."
    >
      <Section id="who" title="1. Who we are and what this covers">
        <p>
          SWIFT is the subscription and billing system of <strong>Jubal Brothers Cable TV Corporation, Palayan Branch</strong> (&ldquo;the company&rdquo;,
          &ldquo;we&rdquo;). The company is the <strong>personal information controller</strong>: it decides why and how your information is used.
        </p>
        <p>
          This policy applies to subscribers who register or are registered by our staff, and to the staff who use the system.
        </p>
        <p>
          Data Protection Officer: <Todo>name and email of the Data Protection Officer, to be provided by the company</Todo>
        </p>
        <CompanyContact variant="card" />
      </Section>

      <Section id="collect" title="2. What we collect">
        <ul>
          <li><strong>About you:</strong> your name, mobile number, address (barangay), and email if you give one.</li>
          <li><strong>About your service:</strong> your service plan, installation date, the MAC address of your equipment, and your service status (Active, Unpaid or Disconnected).</li>
          <li><strong>About your payments:</strong> each payment recorded for you: amount, date, official receipt (OR) number, method, notes, and which staff member recorded it.</li>
          <li><strong>Your account:</strong> your password (kept only in a scrambled form that nobody can read back), whether your mobile number is verified, and the date you agreed to our Terms and this policy.</li>
          <li><strong>Where you are signed in:</strong> for each open sign-in, the type of browser and device it came from (for example “Chrome on Windows”), its network (IP) address, and when it was started and last used. It is shown to you in Settings so you can spot and end a sign-in that is not yours.</li>
          <li><strong>Activity records:</strong> an audit trail of important actions in the system, such as sign-ins, edits and payments, with the date and the person who did them. Passwords and codes are never written to it.</li>
          <li><strong>Messages:</strong> the text messages we send you (reminders, payment confirmations, verification and reset codes).</li>
        </ul>
        <p>We collect it from you when you register, from our staff when they set up or update your service, and from the payments recorded for you.</p>
      </Section>

      <Section id="why" title="3. Why we use it">
        <ul>
          <li><strong>To provide and bill your cable TV service:</strong> to know who you are, which plan you are on, what you owe, and what you have paid.</li>
          <li><strong>To contact you about your service:</strong> payment confirmations, due-date reminders, status changes, and codes for verifying your number or resetting your password.</li>
          <li><strong>To keep the system and your account safe:</strong> signing you in, limiting wrong-password guesses, showing you where you are signed in, and keeping the audit trail.</li>
          <li><strong>To meet our legal and accounting duties:</strong> billing and payment records have to be kept, and may have to be shown to the authorities.</li>
        </ul>
        <p>We do not use your information for advertising, and we do not sell it.</p>
      </Section>

      <Section id="share" title="4. Who can see it">
        <ul>
          <li><strong>Our staff:</strong> administrators and secretaries can see subscriber records. What each secretary may do is set by an administrator, and every important action is recorded in the audit trail.</li>
          <li><strong>You:</strong> you can see your own account, balance and payment history.</li>
          <li><strong>Service providers that run the system for us:</strong> <strong>PhilSMS</strong> (it receives your mobile number and the text of each message in order to deliver it), and our hosting providers <strong>Vercel</strong> (the website) and <strong>Railway</strong> (the server and database). They handle information only to provide their service to us. <Todo>confirm whether any other provider or any data stored outside the Philippines needs to be listed</Todo></li>
          <li><strong>Authorities:</strong> only when the law requires it.</li>
        </ul>
      </Section>

      <Section id="lifecycle" title="5. The life of your information">
        <ol className="list-decimal space-y-2 pl-6">
          <li><strong>Collected</strong> when you register or when our staff set up your service.</li>
          <li><strong>Used and processed</strong> to bill you, record your payments, work out your balance and status, and send you messages.</li>
          <li><strong>Stored</strong> in the system&apos;s database, protected as described in section 9.</li>
          <li><strong>Archived</strong> when you leave or are removed: an archived subscriber cannot sign in, and their record is set aside, not shown in normal lists, and can be restored.</li>
          <li><strong>Kept</strong> only as long as section 6 allows.</li>
          <li><strong>Deleted or anonymised</strong> at the end of that time, or earlier where you ask and the law allows (sections 7 and 8).</li>
        </ol>
      </Section>

      <Section id="keep" title="6. How long we keep it">
        <ul>
          <li><strong>Your SWIFT account</strong> (your login): while you want it. When you delete your account, or after it has been <strong>inactive for <Todo>one year, to be confirmed by the company</Todo></strong>, the login is deleted.</li>
          <li><strong>The company&apos;s record of you as a subscriber</strong> (your name, address, mobile number, plan, installation date, service status and payments): <Todo>number of years, to be confirmed by the company with its accountant</Todo>. We keep this even after you delete your account, because it is the company&apos;s own record and the integrity of its books depends on it. It is marked with a note that you deleted your account, and we send you no more text messages. After that period it is anonymised or destroyed.</li>
          <li><strong>The audit trail:</strong> <Todo>period, to be confirmed by the company</Todo>.</li>
          <li><strong>Verification and reset codes:</strong> ten minutes, and they are stored scrambled.</li>
          <li><strong>Where you are signed in</strong> (browser, device type and network address): only while the sign-in is open. It is deleted when you sign out or end it, and a sign-in that simply runs out is cleared within about a day. The network address is shown to you with its last part hidden.</li>
        </ul>
      </Section>

      <Section id="rights" title="7. Your rights">
        <p>Under the Data Privacy Act you have the right to:</p>
        <ul>
          <li><strong>Be informed</strong> about how your information is used. This page is that notice.</li>
          <li><strong>Access</strong> your information. You can see your own details, balance and payment history in SWIFT, and ask us for a copy.</li>
          <li><strong>Correct</strong> information that is wrong or out of date.</li>
          <li><strong>Object</strong> to processing that is not needed to provide your service or meet a legal duty, such as text messages that are not about your account.</li>
          <li><strong>Erasure or blocking:</strong> ask us to remove your information, within the limits explained in sections 6 and 8.</li>
          <li><strong>Data portability:</strong> ask for your information in a common electronic format.</li>
          <li><strong>Be compensated</strong> for damage caused by inaccurate, false or unlawfully obtained information.</li>
          <li><strong>Complain</strong> to the National Privacy Commission (see section 11).</li>
        </ul>
        <p>To use any of these, contact the Data Protection Officer in section 1. We will answer within <Todo>number of days, to be confirmed by the company</Todo>.</p>
      </Section>

      <Section id="delete" title="8. Deleting your account">
        <p>
          You can delete your own account at any time from <strong>Settings</strong>, at the bottom of the page. We will ask for the reason (optional),
          explain what happens, and ask you to confirm with your password.
        </p>
        <p><strong>What happens:</strong></p>
        <ul>
          <li>Your login (your SWIFT account) is deleted and stops working straight away.</li>
          <li>The company&apos;s <strong>record of you is kept</strong>, as explained in section 6, with a note that you deleted your account, so its financial records stay complete and correct. We send you no more text messages.</li>
          <li>Anything you still owe stays owed. Deleting an account does not cancel a balance.</li>
          <li>If you want a SWIFT account again later, you can register again with the same mobile number; our staff will link it to your existing record.</li>
        </ul>
      </Section>

      <Section id="security" title="9. How we protect it">
        <ul>
          <li>Passwords are scrambled before they are stored. Nobody, including our administrators, can see or reset your password; you reset it yourself with a code sent to your verified mobile number.</li>
          <li>Staff only see what their role allows, and sensitive actions ask them to type their own password again.</li>
          <li>Signing in is limited after several wrong passwords, and sign-ins end after a period of inactivity.</li>
          <li>Connections to the system are encrypted, and an audit trail records who did what.</li>
        </ul>
        <p>No system is perfectly secure. If your information is ever involved in a breach that puts you at risk, we will tell you and the National Privacy Commission as the law requires.</p>
      </Section>

      <Section id="cookies" title="10. Cookies and browser storage">
        <p>
          SWIFT does not use advertising or tracking cookies. It stores a sign-in token in your browser so you stay signed in (it is removed when you sign
          out, or when you close the browser unless you chose &ldquo;Keep me signed in&rdquo;), and a few preferences on your device, such as dark mode, text size
          and the last few subscribers staff opened.
        </p>
      </Section>

      <Section id="contact" title="11. Questions, changes and complaints">
        <p>
          If we change this policy, the new version will be posted here with its date, and you will be asked to agree again if the change is important.
          Please read it together with our <Link to="/terms" className="text-primary underline dark:text-blue-300">Terms of Service</Link>.
        </p>
        <p>
          If you think your rights were not respected, you may complain to the <strong>National Privacy Commission</strong> (privacy.gov.ph).
        </p>
      </Section>
    </LegalLayout>
  )
}
