"use client"

import { ChangeEvent, useEffect, useMemo, useState } from "react"

type FeeRow = Record<string, string>
type ParsedUpload = { rows: FeeRow[]; evidence: string[]; decisions: Map<string, string> }

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

function normalizeJsonUpload(value: unknown): ParsedUpload {
  const root = value && typeof value === "object" ? value as Record<string, unknown> : {}
  const rawRows = Array.isArray(value) ? value : (root.recovery_cases ?? root.cases ?? root.rows ?? root.records ?? root.data ?? [])
  const cases = Array.isArray(rawRows) ? rawRows : []
  const evidence: string[] = []
  const decisions = new Map<string, string>()
  const rows = cases.map((item, index) => {
    const source: Record<string, unknown> = item && typeof item === "object" ? item as Record<string, unknown> : { value: item }
    const decision = source.decision && typeof source.decision === "object" ? source.decision as Record<string, unknown> : {}
    const checks = Array.isArray(source.checks) ? source.checks : []
    const row = Object.fromEntries(Object.entries(source).filter(([key]) => key !== "decision" && key !== "checks").map(([key, entry]) => [key, typeof entry === "string" ? entry : JSON.stringify(entry)])) as FeeRow
    const caseId = field(row, "line_id", "case_id", "id") || String(index + 1)
    const verdict = String(decision.recovery_decision ?? source.recovery_decision ?? source.status ?? "UNCERTAIN")
    decisions.set(caseId, verdict)
    const refs = [decision.reason, decision.evidence_reference, ...checks.map((check) => typeof check === "object" && check ? JSON.stringify(check) : String(check))].filter(Boolean).map(String)
    evidence.push(...refs)
    return { ...row, case_id: caseId, recovery_decision: verdict, reason: String(decision.reason ?? source.reason ?? "") }
  })
  return { rows, evidence: Array.from(new Set(evidence)), decisions }
}

export default function Home() {
  const [rows, setRows] = useState<FeeRow[]>([])
  const [query, setQuery] = useState("")
  const [filter, setFilter] = useState("all")
  const [uploadedName, setUploadedName] = useState("")
  const [uploadError, setUploadError] = useState("")
  const [uploadedFormat, setUploadedFormat] = useState<"CSV" | "JSON" | "API">("API")
  const [evidence, setEvidence] = useState<string[]>([])
  const [decisions, setDecisions] = useState<Map<string, string>>(new Map())
  const [activeView, setActiveView] = useState<"review" | "reports" | "evidence">("review")

  useEffect(() => { fetch("/api/fees").then((response) => response.json()).then(setRows).catch(() => setUploadError("The default fee report could not be loaded.")) }, [])

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
      try {
        const text = String(reader.result || "")
        const isJson = file.name.toLowerCase().endsWith(".json") || file.type.includes("json")
        const imported = isJson ? normalizeJsonUpload(JSON.parse(text)) : { rows: parseCsv(text), evidence: [], decisions: new Map<string, string>() }
        if (!imported.rows.length) {
          setUploadError("No records were found. Upload a CSV with headers or recovery_cases.json with a records, cases, or recovery_cases array.")
          return
        }
        setRows(imported.rows)
        setEvidence(imported.evidence)
        setDecisions(imported.decisions)
        setUploadedName(file.name)
        setUploadedFormat(isJson ? "JSON" : "CSV")
      } catch {
        setUploadError("This file could not be parsed. Check that it is valid CSV or JSON.")
      }
    }
    reader.onerror = () => setUploadError("The file could not be read. Please try it again.")
    reader.readAsText(file)
    event.target.value = ""
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">RM</span><span>Recovery Manager</span></div>
      <nav aria-label="Primary navigation" className="nav-list">
        <button className={`nav-item ${activeView === "review" ? "active" : ""}`} type="button" onClick={() => setActiveView("review")}><span>Review queue</span><strong>{rows.length}</strong></button>
        <button className={`nav-item ${activeView === "reports" ? "active" : ""}`} type="button" onClick={() => setActiveView("reports")}>Reports</button>
        <button className={`nav-item ${activeView === "evidence" ? "active" : ""}`} type="button" onClick={() => setActiveView("evidence")}>Evidence sources</button>
      </nav>
      <div className="sidebar-note"><span className="status-dot" />Local evidence workspace<div>Files are reviewed before a claim is prepared.</div></div>
    </aside>

    <section className="content">
      <header className="topbar"><div><p className="eyebrow">Recovery / Review queue</p><h1>Fee lines and evidence</h1></div><label className="upload-button"><span>Upload CSV or JSON</span><input type="file" accept=".csv,.json,text/csv,application/json" onChange={handleUpload} /></label></header>
      {uploadedName && <div className="notice" role="status">Loaded <strong>{uploadedName}</strong>. Review the imported rows below.</div>}
      {uploadError && <div className="notice error" role="alert">{uploadError}</div>}

      <section className="stats" aria-label="Dataset summary">
        <div className="stat-card"><span>Rows loaded</span><strong>{rows.length}</strong><small>From current report</small></div>
        <div className="stat-card"><span>Fee report lines</span><strong>{feeLines}</strong><small>Eligible for review</small></div>
        <div className="stat-card"><span>Units referenced</span><strong>{units}</strong><small>Unique unit IDs</small></div>
        <div className="stat-card"><span>Reported amount</span><strong>{formatMoney(total)}</strong><small>Sum of amount_usd</small></div>
      </section>

      <section className={`panel ${activeView !== "review" ? "view-hidden" : ""}`} id="review">
        <div className="panel-heading"><div><h2>Review queue</h2><p>Trace each charge back to the unit and its upstream record.</p></div><span className="record-count">{filteredRows.length} shown</span></div>
        <div className="toolbar"><label className="search"><span className="sr-only">Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search unit, SKU, charge type..." /></label><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by report type"><option value="all">All report types</option><option value="fee_report">Fee reports</option><option value="inventory_adjustment">Inventory adjustments</option><option value="reimbursement_report">Reimbursements</option></select></div>
        <div className="table-wrap"><table><thead><tr><th>Line</th><th>Unit</th><th>Charge</th><th>SKU</th><th>Report</th><th>Amount</th><th>Posted</th><th>Decision</th></tr></thead><tbody>{filteredRows.map((row, index) => { const lineId = field(row, "line_id", "line", "id") || String(index + 1); const unitId = field(row, "unit_id", "unit", "unit id"); const chargeType = field(row, "charge_type", "charge", "charge type"); const sku = field(row, "sku", "item", "item sku"); const reportType = field(row, "report_type", "report type", "type"); const amount = field(row, "amount_usd", "amount", "amount usd"); const postedDate = field(row, "posted_date", "posted", "posted date", "date"); return <tr key={`${lineId}-${index}`}><td className="mono">{lineId}</td><td className="mono">{unitId || "Not provided"}</td><td>{label(chargeType) || "Not provided"}</td><td className="mono">{sku || "Not provided"}</td><td><span className="tag">{label(reportType) || "Uncategorized"}</span></td><td className="amount">{formatMoney(Number(amount.replace(/[$,]/g, "") || 0))}</td><td>{postedDate || "Not provided"}</td><td><span className="decision">{decisions.get(lineId) || field(row, "recovery_decision", "decision", "status") || "Needs review"}</span></td></tr> })}</tbody></table>{!filteredRows.length && <div className="empty">No records match the current search.</div>}</div>
      </section>

      <section className={`panel secondary-panel ${activeView !== "reports" ? "view-hidden" : ""}`} id="reports" aria-labelledby="reports-heading">
        <div className="panel-heading"><div><h2 id="reports-heading">Reports</h2><p>Report types currently present in the loaded dataset.</p></div><span className="record-count">{new Set(rows.map((row) => field(row, "report_type", "report type", "type")).filter(Boolean)).size} types</span></div>
        <div className="report-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, padding: 20 }}>
          {Array.from(new Set(rows.map((row) => field(row, "report_type", "report type", "type")).filter(Boolean))).map((reportType) => {
            const reportRows = rows.filter((row) => field(row, "report_type", "report type", "type") === reportType)
            const reportTotal = reportRows.reduce((sum, row) => sum + Number(field(row, "amount_usd", "amount", "amount usd").replace(/[$,]/g, "") || 0), 0)
            return <button className="report-card" style={{ minHeight: 170, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 20, textAlign: "left", color: "#e8eceb", background: "#171d1b", border: "1px solid #303a36", borderRadius: 4, cursor: "pointer" }} type="button" key={reportType} onClick={() => { setFilter(reportType); setActiveView("review") }}><span className="card-kicker" style={{ color: "#87a397", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Report type</span><strong>{label(reportType)}</strong><span className="report-card-meta">{reportRows.length} {reportRows.length === 1 ? "row" : "rows"} <span aria-hidden="true">·</span> {formatMoney(reportTotal)}</span><span className="card-action">View matching records <span aria-hidden="true">→</span></span></button>
          })}
          {!rows.length && <div className="empty">Load a CSV to view its report types.</div>}
        </div>
      </section>

      <section className={`panel secondary-panel ${activeView !== "evidence" ? "view-hidden" : ""}`} id="evidence" aria-labelledby="evidence-heading">
        <div className="panel-heading"><div><h2 id="evidence-heading">Evidence sources</h2><p>Files and fields used to review the current records.</p></div><span className="record-count">{uploadedName ? `${uploadedFormat} upload` : "API dataset"}</span></div>
        <div className="evidence-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, padding: 20 }}>
          <button className="evidence-card" style={{ minHeight: 190, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, padding: 20, textAlign: "left", color: "#e8eceb", background: "#171d1b", border: "1px solid #303a36", borderRadius: 4, cursor: "pointer" }} type="button" onClick={() => { setActiveView("review"); window.scrollTo({ top: 0, behavior: "smooth" }) }}><span className="evidence-icon" style={{ display: "grid", placeItems: "center", width: 42, height: 30, color: "#b9d8c8", background: "#24332d", border: "1px solid #3c584b", fontSize: 10, fontWeight: 800, letterSpacing: ".06em" }} aria-hidden="true">CSV</span><span className="card-kicker" style={{ color: "#87a397", fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>Loaded source</span><strong>{uploadedName || "Current fee report"}</strong><span>{uploadedName ? `Loaded ${rows.length} records from this ${uploadedFormat} file.` : "Records loaded from the fee report API."}</span><span className="card-action">Open review queue <span aria-hidden="true">→</span></span></button>
          <button className="evidence-card" type="button" onClick={() => { setActiveView("reports"); window.scrollTo({ top: 0, behavior: "smooth" }) }}><span className="evidence-icon" aria-hidden="true">REF</span><span className="card-kicker">Available checks</span><strong>Record fields and checks</strong><span>{evidence.length ? `${evidence.length} evidence references loaded from recovery output.` : "Unit, charge, SKU, report type, amount, and posted date are available when provided."}</span><span className="card-action">View report breakdown <span aria-hidden="true">→</span></span></button>
        </div>
      </section>
      <footer>Recovery Manager only recommends a claim when available evidence supports the charge decision. Unsupported or missing evidence stays in review.</footer>
    </section>\n  </main>
}
