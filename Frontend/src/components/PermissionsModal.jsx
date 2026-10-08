import { useEffect, useState } from 'react'
import usersApi from '../api/users'
import Modal from './Modal'
import { LoadingStatus } from './Skeletons.jsx'
import { Skeleton } from '@/components/ui/skeleton'
import { errorMessage } from '../utils/errors'
import { Button } from '@/components/ui/button'

/**
 * Lets an admin choose exactly which tasks one secretary may do.
 * `user.permissions === null` means "never customised", which behaves as everything allowed.
 */
export default function PermissionsModal({ user, onClose, onSaved }) {
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

  const save = async (permissions) => {
    setSaving(true)
    setError('')
    try {
      const res = await usersApi.updatePermissions(user.id, permissions)
      onSaved(res.data.user, res.data.message)
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
      description={user ? `Choose what ${user.name} is allowed to do. Changes take effect on their next action.` : ''}
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
    </Modal>
  )
}
