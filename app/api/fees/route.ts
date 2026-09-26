import { promises as fs } from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"

export async function GET() {
  const csv = await fs.readFile(path.join(process.cwd(), "data/fee_report_sample.csv"), "utf8")
  const [headerLine, ...lines] = csv.trim().split(/\r?\n/)
  const headers = headerLine.split(",")
  const rows = lines.filter(Boolean).map((line) => {
    const values = line.split(",")
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  })
  return NextResponse.json(rows)
}
