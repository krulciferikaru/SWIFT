import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../hooks/useToast'
import smsApi from '../api/sms'
import subscriberApi from '../api/subscribers'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Sun, Moon, Send, BellRing } from 'lucide-react'

const SMS_MESSAGE_MAX = 300

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const { user } = useAuth()
  const [confirmLogout, setConfirmLogout] = useState(true)
  const { toast, showToast } = useToast()
  const [smsPhone, setSmsPhone] = useState('')
  const [smsMessage, setSmsMessage] = useState('')
  const [sendingSms, setSendingSms] = useState(false)
  const [unpaidCount, setUnpaidCount] = useState(null)
  const [sendingReminders, setSendingReminders] = useState(false)

  const canSendSms = user?.role === 'admin' || user?.role === 'secretary'

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
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
            }`}
        >
          {toast.message}
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your preferences for SWIFT.</p>
      </div>

      <Card>
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

      <Card>
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

      {canSendSms && (
        <Card>
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
        <Card>
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