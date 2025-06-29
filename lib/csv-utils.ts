// This file should only be used on the server side

export function createCSV(data: any[], headers: string[]): string {
  // Escape CSV values
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '""'
    }

    const stringValue = String(value)

    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
      return `"${stringValue.replace(/"/g, '""')}"`
    }

    return `"${stringValue}"`
  }

  // Create header row
  const headerRow = headers.map(escapeCSVValue).join(",")

  // Create data rows
  const dataRows = data.map((row) =>
    headers
      .map((header) => {
        const key = header.toLowerCase().replace(/\s+/g, "")
        return escapeCSVValue(row[key] || row[header] || "")
      })
      .join(","),
  )

  return [headerRow, ...dataRows].join("\n")
}

export function generateAttendanceCSV(attendanceData: any[]): string {
  const headers = ["Student Name", "Roll Number", "Date", "Time", "Status", "Session ID"]

  return createCSV(attendanceData, headers)
}
