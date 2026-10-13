import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import PhoneVerification from '../components/PhoneVerification.jsx'
import SecurityCard from '../components/SecurityCard.jsx'
import DeleteAccountCard from '../components/DeleteAccountCard.jsx'
import StaffMobileNumber from '../components/StaffMobileNumber.jsx'
import TextSizeControl from '../components/TextSizeControl.jsx'
import ThemeSwitch from '../components/ThemeSwitch.jsx'
import CompanyInfoForm from '../components/CompanyInfoForm.jsx'
import PaymentMethodsManager from '../components/PaymentMethodsManager.jsx'
import BarangaysManager from '../components/BarangaysManager.jsx'
import { useToast } from '../hooks/useToast'
import smsApi from '../api/sms'
import subscriberApi from '../api/subscribers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Send, BellRing, PlayCircle, ShieldCheck, HelpCircle, ChevronRight, FileText } from 'lucide-react'
import TourButton from "../components/TourButton.jsx";
import ReviewDialog from '../components/ReviewDialog.jsx'
import { runTour } from '../tour/useTour'
import { useShowTourButtons, setShowTourButtons } from '../tour/tourState'
import Toast from "../components/Toast.jsx";

const SMS_MESSAGE_MAX = 300

function SettingsLink({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-primary/50 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700/50"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</span>
        <span className="block text-xs text-gray-500 dark:text-gray-400">{description}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </Link>
  )
}

export default function Settings() {
  const { theme } = useTheme()
  const { user, can } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(true)
  const showTourButtons = useShowTourButtons()
  const { toast, showToast } = useToast()
  const [smsPhone, setSmsPhone] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [unpaidCount, setUnpaidCount] = useState(null)
  const [sendingReminders, setSendingReminders] = useState(false)
  // Texts cannot be recalled, so both ways of sending one ask first.
  const [confirmSms, setConfirmSms] = useState(false)
  const [confirmReminders, setConfirmReminders] = useState(false)

  const canSendSms = can('sms.send')
  const showPhoneCard = Boolean(user?.contact_number) || user?.role !== 'subscriber'

  useEffect(() => {
    const skip = localStorage.getItem('skipLogoutConfirm') === 'true'
    setConfirmLogout(!skip)
  }, [])

  useEffect(() => {
    if (!canSendSms) return
    subscriberApi.getSummary()
      .then((res) => setUnpaidCount(res.data?.data?.unpaid ?? 0))
      .catch(() => setUnpaidCount(null))
  }, [canSendSms])

  const handleConfirmLogoutChange = (checked) => {
    setConfirmLogout(checked)
    localStorage.setItem('skipLogoutConfirm', String(!checked))
  }

  const handleSendSms = (e) => {
    e.preventDefault()
    if (!smsPhone.trim() || !smsMessage.trim()) return
    setConfirmSms(true)
  }

  const sendSms = async () => {
    setSendingSms(true)
    try {
      const res = await smsApi.send(smsPhone.trim(), smsMessage.trim())
      showToast(res.data?.message || 'SMS sent successfully.')
      setSmsMessage('')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send SMS.', 'error')
    } finally {
      setSendingSms(false)
      setConfirmSms(false)
    }
  }

  const handleSendReminders = async () => {
    setSendingReminders(true)
    try {
      const res = await subscriberApi.sendReminders()
      showToast(res.data?.message || 'Reminders sent.')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send reminders.', 'error')
    } finally {
      setSendingReminders(false)
      setConfirmReminders(false)
    }
  }

  return (
    <div className="space-y-8">
      <Toast toast={toast} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your preferences for SWIFT.</p>
        </div>
        <TourButton tour="settings" />
      </div>

      <div data-tour="settings-pages" className="grid gap-3 sm:grid-cols-2 lg:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))]" style={{ "--cols": user?.role === "admin" ? 4 : 3 }}>
        {user?.role === 'admin' && (
          <SettingsLink
            to="/users"
            icon={ShieldCheck}
            title="Manage Roles"
            description="Staff accounts, permissions and password resets."
          />
        )}
        <SettingsLink
          to="/guide"
          icon={HelpCircle}
          title="Guide"
          description="How every page works, with step-by-step tours."
        />
        <SettingsLink
          to="/privacy"
          icon={FileText}
          title="Privacy Policy"
          description="How your information is collected, used, kept and deleted."
        />
        <SettingsLink
          to="/terms"
          icon={FileText}
          title="Terms of Service"
          description="The rules for using SWIFT."
        />
      </div>

      {/* Settings are grouped under headings, two cards across on wide screens. */}
      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2 dark:border-gray-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Preferences</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">How SWIFT looks and behaves for you.</p>
        </div>
        <div className="grid items-stretch gap-6 xl:grid-cols-2 xl:[&>*:last-child:nth-child(odd)]:col-span-2">
      <Card data-tour="settings-appearance">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how SWIFT looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Theme</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {theme === 'dark' ? 'Currently using dark mode' : 'Currently using light mode'}
              </p>
            </div>
            <ThemeSwitch className="w-48" />
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 pt-5">
            <div>
              <p className="text-sm font-medium">Text size</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Make everything in SWIFT bigger and easier to read.</p>
            </div>
            <TextSizeControl />
          </div>
        </CardContent>
      </Card>

      <Card data-tour="settings-guidance">
        <CardHeader>
          <CardTitle className="text-base">Tours</CardTitle>
          <CardDescription>Control the guided tours that explain each page.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="tour-buttons-toggle" className="cursor-pointer">Show "Take a tour" buttons</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Turn off to hide the buttons on pages and forms. You can still start any tour from the Guide.
              </p>
            </div>
            <Switch
              id="tour-buttons-toggle"
              checked={showTourButtons}
              onCheckedChange={setShowTourButtons}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Welcome tour</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Walk through the menu again, the same tour you see on your first visit.
              </p>
            </div>
            <Button type="button" variant="outline" className="gap-1.5 shrink-0" onClick={() => runTour('layout', { user })}>
              <PlayCircle className="size-4" />
              Replay welcome tour
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-tour="settings-account">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Control confirmation prompts and account behavior.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="logout-confirm-toggle" className="cursor-pointer">Confirm before logging out</Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Show a confirmation dialog every time you log out.
              </p>
            </div>
            <Switch
              id="logout-confirm-toggle"
              checked={confirmLogout}
              onCheckedChange={handleConfirmLogoutChange}
            />
          </div>
        </CardContent>
      </Card>
        </div>
      </section>

      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2 dark:border-gray-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Your account</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Your mobile number and how you sign in.</p>
        </div>
        <div className="grid items-stretch gap-6 xl:grid-cols-2 xl:[&>*:last-child:nth-child(odd)]:col-span-2">
      {showPhoneCard && (
        <Card data-tour="settings-phone">
          <CardHeader>
            <CardTitle className="text-base">Mobile number</CardTitle>
            <CardDescription>
              {user?.role === 'subscriber'
                ? 'Verifying your number confirms that reminders and notices reach you, and lets you reset your own password.'
                : 'Add your mobile number and verify it with a texted code. It is how you get back in if you forget your password.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.role !== 'subscriber' && <StaffMobileNumber />}
            <PhoneVerification />
          </CardContent>
        </Card>
      )}

      <SecurityCard />

      {user?.role === 'subscriber' && <DeleteAccountCard />}
        </div>
      </section>

      {canSendSms && (
      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2 dark:border-gray-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Text messages</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Send a one-off text or remind everyone who owes.</p>
        </div>
        <div className="grid items-stretch gap-6 xl:grid-cols-2 xl:[&>*:last-child:nth-child(odd)]:col-span-2">
        <Card data-tour="settings-sms">
          <CardHeader>
            <CardTitle className="text-base">Send SMS</CardTitle>
            <CardDescription>Send an ad-hoc SMS to any Philippine mobile number via PhilSMS.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendSms} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="sms-phone">Phone number</Label>
                <Input
                  id="sms-phone"
                  type="tel"
                  placeholder="09XXXXXXXXX"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sms-message">Message</Label>
                <Textarea
                  id="sms-message"
                  placeholder="Type your message..."
                  value={smsMessage}
                  maxLength={SMS_MESSAGE_MAX}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
                  {smsMessage.length}/{SMS_MESSAGE_MAX}
                </p>
              </div>
              <Button type="submit" disabled={sendingSms}>
                <Send className="size-4" />
                {sendingSms ? 'Sending...' : 'Send SMS'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card data-tour="settings-reminders">
          <CardHeader>
            <CardTitle className="text-base">Payment Reminders</CardTitle>
            <CardDescription>
              Send a balance-reminder SMS to every subscriber currently marked Unpaid
              {unpaidCount !== null && ` (${unpaidCount} right now)`}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setConfirmReminders(true)} disabled={sendingReminders || unpaidCount === 0}>
              <BellRing className="size-4" />
              {sendingReminders ? 'Sending...' : 'Send Reminders'}
            </Button>
          </CardContent>
        </Card>
        </div>
      </section>
      )}

      {user?.role === 'admin' && (
      <section className="space-y-4">
        <div className="border-b border-gray-200 pb-2 dark:border-gray-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">Administration</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">Choices the rest of the office works from.</p>
        </div>
        <div className="grid items-stretch gap-6 xl:grid-cols-2 xl:[&>*:last-child:nth-child(odd)]:col-span-2">
      {user?.role === 'admin' && <PaymentMethodsManager showToast={showToast} />}

      {user?.role === 'admin' && <BarangaysManager showToast={showToast} />}

      {user?.role === 'admin' && <CompanyInfoForm showToast={showToast} />}
        </div>
      </section>
      )}

      <ReviewDialog
        open={confirmSms}
        sensitive
        onOpenChange={setConfirmSms}
        title="Send this text message?"
        description="Check the number and the message before it goes out."
        rows={[
          { label: 'To', value: smsPhone.trim(), emphasis: true },
          { label: 'Message', value: smsMessage.trim() },
        ]}
        warning="A text cannot be recalled and uses SMS credit."
        confirmLabel="Send SMS"
        busyLabel="Sending..."
        busy={sendingSms}
        onConfirm={sendSms}
      />

      <ReviewDialog
        open={confirmReminders}
        sensitive
        onOpenChange={setConfirmReminders}
        title="Send payment reminders to everyone who is Unpaid?"
        description="Each Unpaid subscriber gets a text with the amount they owe."
        rows={[
          { label: 'People who will be texted', value: unpaidCount ?? 'All Unpaid subscribers', emphasis: true },
          { label: 'Message', value: 'Reminder with their balance' },
        ]}
        warning="Texts go to the real mobile numbers on file. They cannot be recalled and each one uses SMS credit."
        confirmLabel="Send reminders"
        busyLabel="Sending..."
        busy={sendingReminders}
        onConfirm={handleSendReminders}
      />
    </div>
  )
}