export default function CsvPreviewTable({ headers, rows, loading, error }) {
  const rowCount = rows.length

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        Loading preview…
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (rowCount === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
        No preview data available.
      </div>
    )
  }

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Preview</p>
          <p className="text-sm text-slate-700">CSV file contents shown as rows and columns</p>
        </div>
        <div className="text-xs text-gray-500">{rowCount} row{rowCount === 1 ? '' : 's'}</div>
      </div>

      <div className="overflow-auto max-h-[60vh] rounded-lg border border-slate-200">
        <table className="min-w-full text-xs border-collapse">
          <thead className="bg-slate-100 sticky top-0 z-10">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="border-b border-slate-200 px-3 py-2 text-left font-semibold text-slate-700"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {headers.map((_, colIndex) => (
                  <td
                    key={`${rowIndex}-${colIndex}`}
                    className="border-b border-slate-100 px-3 py-2 align-top text-slate-800 whitespace-pre-wrap"
                  >
                    {row[colIndex] ?? ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}