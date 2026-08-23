/**
 * Parses raw CSV text into an array of row arrays.
 * Handles quoted fields, escaped quotes, and CRLF/LF line endings.
 */
export function parseCsvRows(csvText) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i]
    const next = csvText[i + 1]

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') {
        i += 1
      }
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

function stripBom(cell) {
  if (typeof cell !== 'string') return cell
  return cell.replace(new RegExp(`^${String.fromCharCode(0xfeff)}`), '').trim()
}

export function extractCsvTableData(csvText) {
  const rawRows = parseCsvRows(csvText)
    .map((row) => row.map((cell) => stripBom(cell)))
    .filter((row) => row.some((cell) => cell !== ''))

  const headerIndex = rawRows.findIndex((row) =>
    row.some((cell) => /subscriber id|name|plan|status/i.test(cell))
  )

  if (headerIndex === -1) {
    return {
      headers: rawRows[0] ?? [],
      rows: rawRows.slice(1),
    }
  }

  return {
    headers: rawRows[headerIndex],
    rows: rawRows.slice(headerIndex + 1),
  }
}