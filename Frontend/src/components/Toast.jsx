import { X } from 'lucide-react'

// Announces messages to screen readers through persistent live regions, and shows the visual
// toast. The message text in the visual toast is hidden from assistive tech so it is not read
// twice; its buttons (Undo, Dismiss) stay reachable by keyboard.
export default function Toast({ toast }) {
  const isError = toast?.type === 'error'

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {toast && !isError ? toast.message : ''}
      </div>
      <div role="alert" aria-atomic="true" className="sr-only">
        {toast && isError ? toast.message : ''}
      </div>
      {toast && (
        <div
          onMouseEnter={toast.pause}
          onMouseLeave={toast.resume}
          onFocus={toast.pause}
          onBlur={toast.resume}
          className={`fixed top-4 right-4 z-50 flex max-w-sm items-start gap-3 rounded-md px-4 py-3 text-sm text-white shadow-md ${
            isError ? 'bg-red-700' : 'bg-green-700'
          }`}
        >
          <span aria-hidden="true" className="flex-1">
            {isError && <strong className="font-semibold">Error: </strong>}
            {toast.message}
          </span>
          {toast.action && (
            <button
              type="button"
              onClick={() => {
                toast.action.onClick()
                toast.dismiss()
              }}
              className="shrink-0 rounded px-1 font-semibold underline underline-offset-2 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
            >
              {toast.action.label}
            </button>
          )}
          <button
            type="button"
            onClick={toast.dismiss}
            aria-label="Dismiss message"
            className="-mr-1 -mt-0.5 shrink-0 rounded p-1 hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-white"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  )
}
