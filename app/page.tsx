"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"

type FeeRow = Record<string, string>

const formatMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.isFinite(value) ? value : 0)
const label = (value: unknown) => String(value ?? "").replaceAll("_", " ")
const field = (row: FeeRow, ...names: string[]) => {
  const entry = Object.entries(row).find(([key]) => names.includes(key.trim().toLowerCase()))
  return entry?.[1] ?? ""
}

function parseCsv(text: string): FeeRow[] {
  const records: string[][] = []
  let record: string[] = []
  let value = ""
  let quoted = false

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    const next = text[index + 1]
    if (character === '"' && quoted && next === '"') { value += '"'; index += 1; continue }
    if (character === '"') { quoted = !quoted; continue }
    if (character === "," && !quoted) { record.push(value.trim()); value = ""; continue }
    if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1
      record.push(value.trim())
      if (record.some(Boolean)) records.push(record)
      record = []; value = ""; continue
    }
    value += character
  }
  if (value || record.length) { record.push(value.trim()); records.push(record) }

  const headers = (records.shift() ?? []).map((header, index) => header || `column_${index + 1}`)
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])))
}

export default function Home() {
  const [rows, setRows] = useState<FeeRow[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [uploadedName, setUploadedName] = useState("")
  const [uploadError, setUploadError] = useState("")

  useEffect(() => { fetch("/api/fees").then((response) => response.json()).then(setRows) }, [])

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesQuery = Object.values(row).some((value) => String(value).toLowerCase().includes(query.toLowerCase()))
    const matchesFilter = filter === "all" || field(row, "report_type", "report type") === filter
    return matchesQuery && matchesFilter
  }), [rows, query, filter])
  const total = rows.reduce((sum, row) => sum + Number(field(row, "amount_usd", "amount", "amount usd").replace(/[$,]/g, "") || 0), 0)
  const feeLines = rows.filter((row) => field(row, "report_type", "report type") === "fee_report").length
  const units = new Set(rows.map((row) => field(row, "unit_id", "unit", "unit id")).filter(Boolean)).size

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    setUploadError("")
    reader.onload = () => {
      const imported = parseCsv(String(reader.result || ""))
      if (!imported.length) {
        setUploadError("This file has no data rows. Choose a CSV with a header row and at least one record.")
        return
      }
      setRows(imported)
      setUploadedName(file.name)
    }
    reader.onerror = () => setUploadError("The file could not be read. Please try it again.")
    reader.readAsText(file)
    event.target.value = ""
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">RM</span><span>Recovery Manager</span></div>
      <nav aria-label="Primary navigation" className="nav-list">
        <a className="nav-item active" href="#review"><span>Review queue</span><strong>{rows.length}</strong></a>
        <a className="nav-item" href="#reports">Reports</a>
        <a className="nav-item" href="#evidence">Evidence sources</a>
      </nav>
      <div className="sidebar-note"><span className="status-dot" />Local evidence workspace<div>Files are reviewed before a claim is prepared.</div></div>
    </aside>

    <section className="content">
      <header className="topbar"><div><p className="eyebrow">Recovery / Review queue</p><h1>Fee lines and evidence</h1></div><label className="upload-button"><span>Upload CSV</span><input type="file" accept=".csv,text/csv" onChange={handleUpload} /></label></header>
      {uploadedName && <div className="notice" role="status">Loaded <strong>{uploadedName}</strong>. Review the imported rows below.</div>}
      {uploadError && <div className="notice error" role="alert">{uploadError}</div>}

      <section className="stats" aria-label="Dataset summary">
        <div className="stat-card"><span>Rows loaded</span><strong>{rows.length}</strong><small>From current report</small></div>
        <div className="stat-card"><span>Fee report lines</span><strong>{feeLines}</strong><small>Eligible for review</small></div>
        <div className="stat-card"><span>Units referenced</span><strong>{units}</strong><small>Unique unit IDs</small></div>
        <div className="stat-card"><span>Reported amount</span><strong>{formatMoney(total)}</strong><small>Sum of amount_usd</small></div>
      </section>

      <section className="panel" id="review">
        <div className="panel-heading"><div><h2>Review queue</h2><p>Trace each charge back to the unit and its upstream record.</p></div><span className="record-count">{filteredRows.length} shown</span></div>
        <div className="toolbar"><label className="search"><span className="sr-only">Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search unit, SKU, charge type..." /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by report type"><option value="all">All report types</option><option value="fee_report">Fee reports</option><option value="inventory_adjustment">Inventory adjustments</option><option value="reimbursement_report">Reimbursements</option></select></div>
        <div className="table-wrap"><table><thead><tr><th>Line</th><th>Unit</th><th>Charge</th><th>SKU</th><th>Report</th><th>Amount</th><th>Posted</th><th>Decision</th></tr></thead><tbody>{filteredRows.map((row, index) => { const lineId = field(row, "line_id", "line", "id") || String(index + 1); const unitId = field(row, "unit_id", "unit", "unit id"); const chargeType = field(row, "charge_type", "charge", "charge type"); const sku = field(row, "sku", "item", "item sku"); const reportType = field(row, "report_type", "report type", "type"); const amount = field(row, "amount_usd", "amount", "amount usd"); const postedDate = field(row, "posted_date", "posted", "posted date", "date"); return <tr key={`${lineId}-${index}`}><td className="mono">{lineId}</td><td className="mono">{unitId || "Not provided"}</td><td>{label(chargeType) || "Not provided"}</td><td className="mono">{sku || "Not provided"}</td><td><span className="tag">{label(reportType) || "Uncategorized"}</span></td><td className="amount">{formatMoney(Number(amount.replace(/[$,]/g, "") || 0))}</td><td>{postedDate || "Not provided"}</td><td><span className="decision">Needs review</span></td></tr> })}</tbody></table>{!filteredRows.length && <div className="empty">No records match the current search.</div>}</div>
      </section>
      <footer>Recovery Manager only recommends a claim when available evidence supports the charge decision. Unsupported or missing evidence stays in review.</footer>
    </section>
  </main>
}
