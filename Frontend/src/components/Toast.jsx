// Announces messages to screen readers through persistent live regions, and
// shows the visual toast (hidden from assistive tech so it is not read twice).
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
          aria-hidden="true"
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-md shadow-md text-sm text-white ${
            isError ? 'bg-red-700' : 'bg-green-700'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  )
}
