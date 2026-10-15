import { useEffect, useState } from 'react'
import usersApi from '../api/users'
import Modal from './Modal'
import { LoadingStatus } from './Skeletons.jsx'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '../utils/errors'
import { Button } from '@/components/ui/button'
import StepUpDialog from './StepUpDialog.jsx'
import { useAuth } from '../context/AuthContext'

/**
 * Lets an admin choose exactly which tasks one secretary or field collector may do.
 * `user.permissions === null` means "never customised": everything allowed for a secretary, and the short
 * default list (view subscribers, view and record payments) for a collector.
 */
export default function PermissionsModal({ user, onClose, onSaved }) {
  const { user: me } = useAuth()
  // Changing what someone may do needs the admin's own current authenticator code too (the password is asked for separately).
  const [pending, setPending] = useState(null) // { permissions } waiting for the code
  const [catalog, setCatalog] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) return
    setError('')
    setSelected(new Set(user.effective_permissions ?? []))
    setLoading(true)
    usersApi
      .getPermissionCatalog()
      .then((res) => setCatalog(res.data.data))
      .catch((err) => setError(errorMessage(err, 'Could not load the list of permissions.')))
      .finally(() => setLoading(false))
  }, [user])

  const toggle = (key) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const send = async (permissions, code) => {
    const res = await usersApi.updatePermissions(user.id, permissions, code)
    onSaved(res.data.user, res.data.message)
  }

  const save = async (permissions) => {
    if (me?.mfa_enabled) {
      setPending({ permissions })
      return
    }
    setSaving(true)
    setError('')
    try {
      await send(permissions, undefined)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save permissions.')
    } finally {
      setSaving(false)
    }
  }

  const allOn = catalog.length > 0 && catalog.every((c) => selected.has(c.key))

  return (
    <Modal
      isOpen={!!user}
      onClose={onClose}
      title="Permissions"
      description={user ? `Choose what ${user.name} is allowed to do. Changes take effect on their next action.${user.role === 'collector' ? " A field collector never sees subscribers’ email or MAC addresses, whatever is switched on." : ""}` : ""}
      size="md"
      footer={(requestClose) => (
        <div className="flex flex-wrap justify-between gap-3">
          <Button type="button" variant="ghost" onClick={() => save(null)} disabled={saving || loading}>
            Reset to default
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="button" onClick={() => save([...selected])} disabled={saving || loading}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}
    >
      {error && (
        <div role="alert" className="mb-3 p-3 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400 rounded text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <LoadingStatus>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-start gap-3 py-3">
                <Skeleton className="mt-1 size-4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-64 max-w-full" />
                </div>
              </li>
            ))}
          </ul>
        </LoadingStatus>
      ) : (
        <fieldset>
          <legend className="sr-only">Allowed tasks</legend>
          <div className="flex justify-end mb-2">
            <button
              type="button"
              className="text-xs text-blue-700 dark:text-blue-400 underline"
              onClick={() => setSelected(new Set(allOn ? [] : catalog.map((c) => c.key)))}
            >
              {allOn ? 'Turn all off' : 'Turn all on'}
            </button>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {catalog.map((item) => (
              <li key={item.key}>
                <label className="flex items-start gap-3 py-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 size-4"
                    checked={selected.has(item.key)}
                    onChange={() => toggle(item.key)}
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">{item.label}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{item.help}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}
      <StepUpDialog
        open={!!pending}
        onClose={() => setPending(null)}
        title="Confirm the change"
        description={user ? `You are changing what ${user.name} may do.` : ''}
        confirmLabel="Save permissions"
        onConfirm={async (code) => {
          await send(pending.permissions, code)
          setPending(null)
        }}
      />
    </Modal>
  )
}
