# PR/FAQ — RecoverIQ

## Press Release

### RecoverIQ Turns Operational Evidence Into Defensible Recovery Claims

**25 September 2026**

Sellers often face fees, deductions, and reimbursement events that require evidence before they can be challenged. The evidence needed to support a recovery decision may already exist across upstream operational systems, but connecting the financial event to the correct unit and determining what the evidence actually proves can be difficult.

Today, we introduce **RecoverIQ**, an Evidence-First Recovery Manager designed to turn operational evidence into traceable recovery decisions.

RecoverIQ receives fee and reimbursement events, identifies the affected unit, retrieves relevant upstream evidence, interprets the evidence, and produces a structured recovery decision.

The system follows a simple evidence chain:

**Charge → Unit → Upstream Evidence → Evidence Interpretation → Claim Decision → Supporting Evidence**

For each recovery event, RecoverIQ can return:

- **SUPPORTED** — evidence supports the recovery claim.
- **CONTRADICTED** — evidence indicates the claim should not be made.
- **UNCERTAIN** — available evidence is insufficient or genuinely ambiguous and requires review.
- **SILENT** — available evidence does not establish support for the claim.

Every recommended claim includes the evidence used to reach the decision and the recoverable amount.

RecoverIQ is deliberately not another image-classification system. It does not repeat the work performed by Receiving, Prep, Pack, or Returns Managers. Instead, it consumes their structured evidence and reasons over it.

The system is designed around a conservative principle:

> **Don't maximize claims. Maximize defensible claims.**

When evidence is missing, contradictory, or insufficient, RecoverIQ preserves that uncertainty instead of inventing evidence or forcing a claim decision.

The result is a recovery workflow that can be inspected by a human reviewer and later integrated with the other CUBE Managers.

---

# Frequently Asked Questions

## 1. What problem does RecoverIQ solve?

RecoverIQ addresses the gap between a financial charge and the operational evidence needed to determine whether that charge can be defensibly challenged.

The system connects a charge to the affected unit, retrieves upstream evidence, interprets that evidence, and produces a traceable decision.

---

## 2. Who is the primary user?

The primary user is a seller, recovery analyst, operations analyst, or reviewer responsible for determining whether fees or reimbursement events can be supported by available operational evidence.

---

## 3. What does RecoverIQ take as input?

RecoverIQ is designed to consume:

- Fee or reimbursement records.
- Unit identifiers.
- Upstream evidence records from the other CUBE Managers.
- Evidence metadata.
- Charge amounts and charge types.
- Relevant timestamps and operational context.

The exact fields used by the implementation follow the official CUBE data and evidence contract.

---

## 4. What does RecoverIQ produce?

For each charge, RecoverIQ produces a structured recovery case containing:

- Charge information.
- Matched unit.
- Relevant upstream evidence.
- Per-evidence interpretation.
- Decision.
- Supporting evidence.
- Recommended claim amount where supported.
- Reason for the decision.
- Uncertainty or review reason when applicable.

---

## 5. Does RecoverIQ make every possible claim?

No.

RecoverIQ is intentionally conservative.

A claim should only be recommended when the available evidence supports it.

If the evidence is insufficient or contradictory, the system should not manufacture support for a claim.

---

## 6. Why use UNCERTAIN?

Some recovery cases cannot be reliably classified as supported or contradicted.

Examples include:

- Required evidence is missing.
- Evidence records conflict.
- The charge cannot be confidently matched to a unit.
- Available evidence does not establish the required condition.
- The operational evidence is ambiguous.

In these situations, RecoverIQ returns **UNCERTAIN** and provides a reason for human review.

UNCERTAIN is therefore a decision state, not simply a low confidence score.

---

## 7. How is RecoverIQ different from a generic chatbot?

A chatbot primarily generates natural-language responses.

RecoverIQ is an evidence reasoning workflow.

It performs explicit steps:

```text
Charge
  ↓
Unit Matching
  ↓
Evidence Retrieval
  ↓
Evidence Checks
  ↓
Decision
  ↓
Claim / Review