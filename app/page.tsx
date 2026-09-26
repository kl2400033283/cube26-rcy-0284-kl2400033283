"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"

type FeeRow = { line_id: string; unit_id: string; org_id: string; sku: string; charge_type: string; quantity: string; amount_usd: string; posted_date: string; report_type: string }

const formatMoney = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value)
const label = (value: string) => value.replaceAll("_", " ")

export default function Home() {
  const [rows, setRows] = useState<FeeRow[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [uploadedName, setUploadedName] = useState("")

  useEffect(() => { fetch("/api/fees").then((response) => response.json()).then(setRows) }, [])

  const filteredRows = useMemo(() => rows.filter((row) => {
    const matchesQuery = Object.values(row).some((value) => value.toLowerCase().includes(query.toLowerCase()))
    const matchesFilter = filter === "all" || row.report_type === filter
    return matchesQuery && matchesFilter
  }), [rows, query, filter])
  const total = rows.reduce((sum, row) => sum + Number(row.amount_usd || 0), 0)
  const feeLines = rows.filter((row) => row.report_type === "fee_report").length
  const units = new Set(rows.map((row) => row.unit_id)).size

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result || "")
      const [headerLine, ...lines] = text.trim().split(/\r?\n/)
      if (!headerLine || !lines.length) return
      const headers = headerLine.split(",")
      const imported = lines.filter(Boolean).map((line) => {
        const values = line.split(",")
        return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as FeeRow
      })
      setRows(imported)
      setUploadedName(file.name)
    }
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

      <section className="stats" aria-label="Dataset summary">
        <div className="stat-card"><span>Rows loaded</span><strong>{rows.length}</strong><small>From current report</small></div>
        <div className="stat-card"><span>Fee report lines</span><strong>{feeLines}</strong><small>Eligible for review</small></div>
        <div className="stat-card"><span>Units referenced</span><strong>{units}</strong><small>Unique unit IDs</small></div>
        <div className="stat-card"><span>Reported amount</span><strong>{formatMoney(total)}</strong><small>Sum of amount_usd</small></div>
      </section>

      <section className="panel" id="review">
        <div className="panel-heading"><div><h2>Review queue</h2><p>Trace each charge back to the unit and its upstream record.</p></div><span className="record-count">{filteredRows.length} shown</span></div>
        <div className="toolbar"><label className="search"><span className="sr-only">Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search unit, SKU, charge type..." /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by report type"><option value="all">All report types</option><option value="fee_report">Fee reports</option><option value="inventory_adjustment">Inventory adjustments</option><option value="reimbursement_report">Reimbursements</option></select></div>
        <div className="table-wrap"><table><thead><tr><th>Line</th><th>Unit</th><th>Charge</th><th>SKU</th><th>Report</th><th>Amount</th><th>Posted</th><th>Decision</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.line_id}><td className="mono">{row.line_id}</td><td className="mono">{row.unit_id}</td><td>{label(row.charge_type)}</td><td className="mono">{row.sku}</td><td><span className="tag">{label(row.report_type)}</span></td><td className="amount">{formatMoney(Number(row.amount_usd || 0))}</td><td>{row.posted_date}</td><td><span className="decision">Needs review</span></td></tr>)}</tbody></table>{!filteredRows.length && <div className="empty">No records match the current search.</div>}</div>
      </section>
      <footer>Recovery Manager only recommends a claim when available evidence supports the charge decision. Unsupported or missing evidence stays in review.</footer>
    </section>
  </main>
}
