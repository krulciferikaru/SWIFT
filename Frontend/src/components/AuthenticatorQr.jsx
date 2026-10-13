import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/** The QR code to scan with an authenticator app, and the same secret as text for typing in by hand. */
export default function AuthenticatorQr({ setup }) {
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (!setup) return
    QRCode.toDataURL(setup.uri, { width: 220, margin: 1 }).then(setQr).catch(() => setQr(''))
  }, [setup])

  if (!setup) return null

  return (
    <div className="flex flex-col items-start gap-4 sm:flex-row">
      {qr && <img src={qr} alt="QR code to scan with your authenticator app" width="176" height="176" className="rounded-lg border border-gray-200 bg-white" />}
      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
        <p>In the app, choose to add an account and scan this code with your phone&apos;s camera.</p>
        <p>
          Cannot scan? Choose <em>enter a key</em> and type:
          <span className="mt-1 block select-all break-all rounded bg-gray-100 px-2 py-1.5 font-mono text-xs tracking-wider dark:bg-gray-800">{setup.secret}</span>
        </p>
      </div>
    </div>
  )
}
