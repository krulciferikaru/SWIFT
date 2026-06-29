export default function StatusBadge({ status }) {
  const styles = {
    Active:       'bg-green-100 text-green-700',
    Unpaid:       'bg-yellow-100 text-yellow-700',
    Disconnected: 'bg-red-100 text-red-700',
  }

  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}
