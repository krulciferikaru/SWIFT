import { Link } from 'react-router-dom'
import LegalLayout, { Section, Todo } from '../legal/LegalLayout.jsx'
import { PRIVACY_CONTACT_EMAIL } from '../legal/meta'

const SECTIONS = [
  { id: 'accept', title: 'Agreeing to these terms' },
  { id: 'service', title: 'The service' },
  { id: 'account', title: 'Your account' },
  { id: 'billing', title: 'Billing and payments' },
  { id: 'status', title: 'Service status and disconnection' },
  { id: 'messages', title: 'Text messages' },
  { id: 'use', title: 'Using the system properly' },
  { id: 'privacy', title: 'Your information' },
  { id: 'ending', title: 'Ending your account' },
  { id: 'liability', title: 'Responsibility and changes' },
  { id: 'law', title: 'Governing law and contact' },
]

/**
 * The Terms of Service. A DRAFT until the company has filled in the [bracketed] items and
 * reviewed it (see legal/meta.js).
 */
export default function Terms() {
  return (
    <LegalLayout
      title="Terms of Service"
      sections={SECTIONS}
      intro="These terms are the rules for using SWIFT, the subscriber and billing system of Jubal Brothers Cable TV Corporation, Palayan Branch. Please read them before you register."
    >
      <Section id="accept" title="1. Agreeing to these terms">
        <p>
          By registering for or using SWIFT you agree to these terms and to our{' '}
          <Link to="/privacy" className="text-primary underline dark:text-blue-300">Privacy Policy</Link>. If you do not agree, please do not register.
        </p>
      </Section>

      <Section id="service" title="2. The service">
        <p>
          SWIFT lets you see your subscription, your balance and your payment history, and lets the company&apos;s staff manage subscribers, record payments
          and send you notices. SWIFT is not where your cable TV or internet service itself is delivered; it is the system that keeps your account and billing.
        </p>
        <p>We may improve, change or pause parts of the system, for example for maintenance.</p>
      </Section>

      <Section id="account" title="3. Your account">
        <ul>
          <li>Give correct information when you register, and keep your details up to date.</li>
          <li>Your mobile number (or your email) is your login. Keep your password private and do not share it. You are responsible for what is done with your account.</li>
          <li>You can add <strong>two-step sign-in</strong> in Settings: after your password you also type a 6-digit code from an app on your phone. If you turn it on, keep your phone and your recovery codes safe. If you lose both, the company can switch it off for you so you can sign in again.</li>
          <li>New registrations are reviewed by our staff before the account is activated. We may refuse a registration, for example if the details cannot be matched to a real person.</li>
          <li>If you think someone else is using your account, change your password (Forgot password on the sign-in page), sign out of other devices in Settings, and tell us right away.</li>
        </ul>
      </Section>

      <Section id="billing" title="4. Billing and payments">
        <ul>
          <li>You are billed <strong>monthly</strong> at the rate of your service plan. Billing starts the month <strong>after</strong> your installation date; the installation month is not billed.</li>
          <li>Payments are recorded by our staff after they are received (cash, GCash or another method the company accepts). A payment appears in your history once it is recorded. SWIFT does not take online payments.</li>
          <li>A payment recorded by mistake can be cancelled by our staff. It stays in your history marked <strong>Cancelled</strong> with the reason, and it does not count towards your balance.</li>
          <li>A payment goes to your oldest unpaid month first. Money paid beyond what you owe stays as credit towards later months.</li>
          <li>The <strong>payment receipt</strong> SWIFT can print is a summary of a recorded payment. It is not a BIR-registered official receipt.</li>
          <li>Plan rates and billing rules are set by the company and may change. <Todo>how and when a change in rate or plan takes effect, to be confirmed by the company</Todo></li>
        </ul>
      </Section>

      <Section id="status" title="5. Service status and disconnection">
        <p>
          Your service status follows your payments: <strong>Active</strong> when you are paid up, <strong>Unpaid</strong> when you are behind, and{' '}
          <strong>Disconnected</strong> when you are three or more months behind. A disconnected service can be reconnected after the balance is paid and
          the company has completed the reconnection. <Todo>any reconnection fee or waiting time, to be confirmed by the company</Todo>
        </p>
      </Section>

      <Section id="messages" title="6. Text messages">
        <p>
          You agree that we may send text messages to your mobile number about your account: payment confirmations, due-date reminders, status changes, and codes
          for verifying your number or resetting your password. Standard message rates of your network may apply. Messages go through our SMS provider and may not reach every mobile network.
          <Todo>networks covered, to be confirmed by the company</Todo>
        </p>
      </Section>

      <Section id="use" title="7. Using the system properly">
        <ul>
          <li>Do not try to get into another person&apos;s account, or into parts of the system you are not allowed to use.</li>
          <li>Do not try to disrupt the system or test its security without our written permission.</li>
          <li>Do not give false information or use someone else&apos;s name or number.</li>
        </ul>
        <p>We may suspend or remove an account that breaks these rules.</p>
      </Section>

      <Section id="privacy" title="8. Your information">
        <p>
          How we collect, use, keep and delete your information, and your rights over it, are in the{' '}
          <Link to="/privacy" className="text-primary underline dark:text-blue-300">Privacy Policy</Link>.
        </p>
      </Section>

      <Section id="ending" title="9. Ending your account">
        <ul>
          <li>You can delete your account yourself in <strong>Settings</strong>. Your login and contact details are then removed, but billing and payment records are kept as the Privacy Policy explains.</li>
          <li>Deleting an account does not cancel what you owe.</li>
          <li>We may end an account that is inactive for a long time or that breaks these terms, after telling you where we can.</li>
        </ul>
      </Section>

      <Section id="liability" title="10. Responsibility and changes">
        <p>
          We take care to keep SWIFT accurate and available, but we cannot promise it will always be free of errors or interruptions. If you see a mistake in your
          balance or payments, tell us and we will check it. <Todo>any limit on the company&apos;s responsibility, to be written or confirmed by the company&apos;s legal adviser</Todo>
        </p>
        <p>
          We may update these terms. When we do, the new version is posted here with its date, and you will be asked to agree again if the change is important.
        </p>
      </Section>

      <Section id="law" title="11. Governing law and contact">
        <p>These terms are governed by the laws of the Republic of the Philippines. <Todo>place where disputes are to be settled, to be confirmed by the company</Todo></p>
        <p>
          Questions about these terms: contact the company using the details shown on the sign-in page. For questions or concerns about your personal information, write to{' '}
          <a className="text-primary underline dark:text-blue-300" href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>.
        </p>
      </Section>
    </LegalLayout>
  )
}
