import { Clock, Mail, MapPin, Phone, Smartphone } from 'lucide-react'
import { useCompanyInfo } from '../hooks/useCompanyInfo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const telHref = (value) => `tel:${String(value).replace(/[^\d+]/g, '')}`

function Line({ icon: Icon, label, children }) {
  return (
    <li className="flex items-start gap-3">
      <Icon className="mt-0.5 size-5 shrink-0 text-gray-500 dark:text-gray-400" aria-hidden="true" />
      <span>
        <span className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>
        <span className="text-gray-900 dark:text-gray-100">{children}</span>
      </span>
    </li>
  )
}

const link = 'font-medium text-blue-700 dark:text-blue-400 underline underline-offset-2'

/**
 * How to reach the company, and how to pay. Shows nothing until an admin has entered something.
 * variant "card" is for the subscriber's dashboard; "inline" is a short line for the sign-in page.
 */
export default function CompanyContact({ variant = 'card' }) {
  const { info, hasAny } = useCompanyInfo()
  if (!hasAny) return null

  if (variant === 'inline') {
    const bits = [
      info.mobile && <a key="m" className={link} href={telHref(info.mobile)}>{info.mobile}</a>,
      info.phone && <a key="p" className={link} href={telHref(info.phone)}>{info.phone}</a>,
      info.email && <a key="e" className={link} href={`mailto:${info.email}`}>{info.email}</a>,
    ].filter(Boolean)
    if (bits.length === 0) return null
    return (
      <p className="mt-3 text-sm text-center text-gray-600 dark:text-gray-400">
        Need help or an account? Contact the company:{' '}
        {bits.map((b, i) => (
          <span key={i}>
            {i > 0 && ' · '}
            {b}
          </span>
        ))}
      </p>
    )
  }

  return (
    <Card data-tour="me-contact">
      <CardHeader>
        <CardTitle className="text-base">Contact the company</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          For payments, refunds, reconnection or any question about your account.
        </p>
        <ul className="space-y-3 text-base">
          {info.mobile && (
            <Line icon={Smartphone} label="Mobile">
              <a className={link} href={telHref(info.mobile)}>{info.mobile}</a>
            </Line>
          )}
          {info.phone && (
            <Line icon={Phone} label="Telephone">
              <a className={link} href={telHref(info.phone)}>{info.phone}</a>
            </Line>
          )}
          {info.email && (
            <Line icon={Mail} label="Email">
              <a className={link} href={`mailto:${info.email}`}>{info.email}</a>
            </Line>
          )}
          {info.address && <Line icon={MapPin} label="Office">{info.address}</Line>}
          {info.office_hours && <Line icon={Clock} label="Office hours">{info.office_hours}</Line>}
        </ul>
        {info.how_to_pay && (
          <div className="rounded-md bg-gray-50 dark:bg-gray-900 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">How to pay</p>
            <p className="mt-1 whitespace-pre-line text-gray-900 dark:text-gray-100">{info.how_to_pay}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
