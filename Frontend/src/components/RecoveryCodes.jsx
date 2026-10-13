import { useState } from 'react'
import { Copy, Download, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * The single-use recovery codes, shown once. They are the way back in if the phone with the
 * authenticator app is lost, so the person is asked to copy or download them somewhere safe.
 */
export default function RecoveryCodes({ codes }) {
  const [copied, setCopied] = useState(false)
  const text = codes.join('\n')

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Copying can be blocked; the codes are on screen and can be downloaded.
    }
  }

  const download = () => {
    const blob = new Blob([`SWIFT recovery codes\nEach code works once.\n\n${text}\n`], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'swift-recovery-codes.txt'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-4 font-mono text-base tracking-wider text-gray-900 dark:bg-gray-900 dark:text-gray-100" aria-label="Recovery codes">
        {codes.map((code) => (
          <li key={code}>{code}</li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy} className="gap-1.5">
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={download} className="gap-1.5">
          <Download className="size-4" aria-hidden="true" />
          Download
        </Button>
      </div>
    </div>
  )
}
