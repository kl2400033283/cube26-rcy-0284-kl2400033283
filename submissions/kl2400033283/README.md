# RecoverIQ — Evidence-First Recovery Manager

## 1. Problem

Recovery teams receive charges and reimbursement-related records that must be checked against upstream operational evidence before a claim is submitted.

The challenge is not simply identifying charges. The system must determine whether the available evidence actually supports recovery, contradicts the charge, or is insufficient.

RecoverIQ is an evidence-first Recovery Manager designed to make that decision traceable and conservative.

> **Don't maximize claims. Maximize defensible claims.**

---

## 2. What the Agent Does

RecoverIQ:

1. Reads fee and reimbursement charge records.
2. Matches each charge to its `unit_id`.
3. Retrieves relevant upstream evidence.
4. Runs deterministic evidence checks.
5. Produces a recovery decision.
6. Records the evidence used for the decision.
7. Routes uncertain cases to human review.
8. Produces structured Recovery Case Files.

---

## 3. Decision Outcomes

The system produces three recovery-level outcomes:

| Decision | Meaning |
|---|---|
| `SUPPORTED` | Evidence contradicts the charge and supports recovery. |
| `CONTRADICTED` | Evidence supports the charge, so recovery is not recommended. |
| `UNCERTAIN` | Evidence is insufficient for a safe automated decision. |

`UNCERTAIN` is intentionally treated as a first-class outcome.

The system does not convert missing evidence into a positive recovery claim.

---

## 4. Decision Flow

```text
Charge
  ↓
Unit Matching
  ↓
Upstream Evidence Retrieval
  ↓
Evidence Checks
  ↓
Evidence Verdict
  ↓
Recovery Decision
  ↓
Claim / Human Review