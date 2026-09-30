# One-Pager — RecoverIQ

## 1. Product

### RecoverIQ — Evidence-First Recovery Manager

RecoverIQ converts operational evidence into defensible recovery decisions.

It receives fee and reimbursement events, connects them to the affected unit, retrieves relevant upstream evidence, interprets the evidence, and determines whether a recovery claim is supported.

### Core principle

> **Don't maximize claims. Maximize defensible claims.**

---

# 2. Problem

Sellers can receive fees, deductions, or other charge events that may be recoverable when operational evidence contradicts the reason for the charge.

The evidence required to investigate a charge may already exist across upstream operational workflows:

- Receiving
- Preparation
- Packing
- Returns

The challenge is connecting the financial event to the correct operational evidence and determining what that evidence actually establishes.

A recovery system must therefore answer:

> **Is this charge actually supported by the available evidence?**

---

# 3. Solution

RecoverIQ creates a traceable recovery case for each charge.

```text
Fee / Reimbursement Event
          ↓
      Charge Parser
          ↓
       Unit Matcher
          ↓
    Evidence Retrieval
          ↓
    Evidence Checks
          ↓
 Evidence Interpretation
          ↓
    Decision Engine
          ↓
 ┌──────────────────────┐
 │ SUPPORTED            │
 │ CONTRADICTED         │
 │ UNCERTAIN            │
 │ SILENT               │
 └──────────────────────┘
          ↓
 Recovery Case / Review