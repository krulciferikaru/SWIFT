import { useState, useEffect } from 'react'
import { useTheme } from '../context/ThemeContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Sun, Moon } from 'lucide-react'

export default function Settings() {
  const { theme, toggleTheme } = useTheme()
  const [confirmLogout, setConfirmLogout] = useState(true)

  useEffect(() => {
    const skip = localStorage.getItem('skipLogoutConfirm') === 'true'
    setConfirmLogout(!skip)
  }, [])

  const handleConfirmLogoutChange = (checked) => {
    setConfirmLogout(checked)
    localStorage.setItem('skipLogoutConfirm', String(!checked))
  }

  return (
    <div className="max-w-2xl space-y-6">
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
    </div>
  )
}