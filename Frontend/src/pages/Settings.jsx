import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import PhoneVerification from '../components/PhoneVerification.jsx'
import { useToast } from '../hooks/useToast'
import smsApi from '../api/sms'
import subscriberApi from '../api/subscribers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Send, BellRing, PlayCircle } from 'lucide-react'
import TourButton from "../components/TourButton.jsx";
import { runTour } from '../tour/useTour'
import { useShowTourButtons, setShowTourButtons } from '../tour/tourState'
import Toast from "../components/Toast.jsx";

const SMS_MESSAGE_MAX = 300

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const { user, can } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(true)
  const showTourButtons = useShowTourButtons()
  const { toast, showToast } = useToast()
  const [smsPhone, setSmsPhone] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [unpaidCount, setUnpaidCount] = useState(null)
  const [sendingReminders, setSendingReminders] = useState(false)

  const canSendSms = can('sms.send')

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

  const handleSendSms = async (e) => {
    e.preventDefault()
    if (!smsPhone.trim() || !smsMessage.trim()) return

    setSendingSms(true)
    try {
      const res = await smsApi.send(smsPhone.trim(), smsMessage.trim())
      showToast(res.data?.message || 'SMS sent successfully.')
      setSmsMessage('')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to send SMS.', 'error')
    } finally {
      setSendingSms(false)
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
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Toast toast={toast} />

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your preferences for SWIFT.</p>
        </div>
        <TourButton tour="settings" />
      </div>

      <Card data-tour="settings-appearance">
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how SWIFT looks on your device.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="size-5 text-gray-500 dark:text-gray-400" />
              ) : (
                <Sun className="size-5 text-gray-500 dark:text-gray-400" />
              )}
              <div>
                <Label htmlFor="theme-toggle" className="cursor-pointer">Dark Mode</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {theme === 'dark' ? 'Currently using dark mode' : 'Currently using light mode'}
                </p>
              </div>
            </div>
            <Switch
              id="theme-toggle"
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
            />
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

      {user?.contact_number && (
        <Card data-tour="settings-phone">
          <CardHeader>
            <CardTitle className="text-base">Mobile number</CardTitle>
            <CardDescription>Verifying your number confirms that reminders and notices reach you.</CardDescription>
          </CardHeader>
          <CardContent>
            <PhoneVerification />
          </CardContent>
        </Card>
      )}

      {canSendSms && (
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
      )}

      {canSendSms && (
        <Card data-tour="settings-reminders">
          <CardHeader>
            <CardTitle className="text-base">Payment Reminders</CardTitle>
            <CardDescription>
              Send a balance-reminder SMS to every subscriber currently marked Unpaid
              {unpaidCount !== null && ` (${unpaidCount} right now)`}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSendReminders} disabled={sendingReminders || unpaidCount === 0}>
              <BellRing className="size-4" />
              {sendingReminders ? 'Sending...' : 'Send Reminders'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}