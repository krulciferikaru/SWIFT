// Small checks run when someone leaves a field, so a slip is pointed out straight away instead
// of after the whole form has been sent. Each one returns an error sentence, or '' when fine.
// The server still checks everything again; these only save a round trip.

export const required = (label) => (value) =>
  String(value ?? '').trim() === '' ? `${label} is required.` : ''

const PH_MOBILE = /^(\+?63|0)9\d{9}$/

/** A Philippine mobile number: 09171234567, 0917 123 4567, 0917-123-4567 or +63 917 123 4567. */
export const mobileNumber = (value) => {
  const text = String(value ?? '').trim()
  if (text === '') return ''
  return PH_MOBILE.test(text.replace(/[\s-]/g, ''))
    ? ''
    : 'Enter a mobile number such as 0917 123 4567.'
}

export const emailAddress = (value) => {
  const text = String(value ?? '').trim()
  if (text === '') return ''
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? '' : 'Enter an email such as name@example.com.'
}

export const minLength = (label, min) => (value) =>
  String(value ?? '') !== '' && String(value).length < min ? `${label} must be at least ${min} characters.` : ''

export const positiveAmount = (value) => {
  if (String(value ?? '').trim() === '') return ''
  const amount = Number(value)
  if (Number.isNaN(amount)) return 'Enter the amount as a number, for example 500 or 500.50.'
  return amount > 0 ? '' : 'The amount must be more than zero.'
}

export const matches = (other, message) => (value) =>
  String(value ?? '') !== '' && value !== other() ? message : ''

/** Runs checks in order and returns the first error sentence. */
export const firstError = (value, ...checks) => {
  for (const check of checks) {
    const error = check(value)
    if (error) return error
  }
  return ''
}
