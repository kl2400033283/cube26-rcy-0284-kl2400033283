# RecoverIQ — Evidence-First Recovery Manager Architecture

## 1. System Overview

RecoverIQ is an evidence-first Recovery Manager that analyzes recovery-related charges against upstream operational evidence.

The system follows a conservative decision model:

```
SUPPORT → Recovery Candidate
CONTRADICT → No Recovery
UNCERTAIN → Human Review
```

The architecture is designed around **traceability, evidence verification, tenant isolation, and explicit uncertainty**.

---

## 2. High-Level Architecture

```
                    ┌──────────────────────┐
                    │     Charge Report    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Charge Intake     │
                    │       / Parser       │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Organization + Unit  │
                    │       Matching       │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
        ┌───────────┐    ┌───────────┐    ┌───────────┐
        │ Receiving │    │   Prep    │    │   Pack    │
        │  Evidence │    │  Evidence │    │  Evidence │
        └─────┬─────┘    └─────┬─────┘    └─────┬─────┘
              │                │                │
              └────────────────┼────────────────┘
                               │
                         ┌─────▼─────┐
                         │  Returns  │
                         │  Evidence │
                         └─────┬─────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Evidence Verification│
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Charge-Specific      │
                    │ Evidence Checks      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Decision Engine    │
                    └──────────┬───────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
                ▼              ▼              ▼
           ┌────────┐    ┌────────────┐   ┌───────────┐
           │SUPPORTED│    │CONTRADICTED│   │ UNCERTAIN │
           └────┬────┘    └─────┬──────┘   └─────┬─────┘
                │               │                │
                ▼               ▼                ▼
           Recovery          Reject /         Human
           Candidate         No Recovery      Review
                │               │                │
                └───────────────┼────────────────┘
                                ▼
                    ┌──────────────────────┐
                    │ Recovery Case File   │
                    │ + Evidence Trace     │
                    └──────────────────────┘
```

---

## 3. Core Components

### 3.1 Charge Intake / Parser

The charge intake component reads the fee report and converts each charge into a structured internal representation.

The charge record contains information such as:

- `line_id`
- `report_type`
- `unit_id`
- `org_id`
- `sku`
- `fnsku`
- `fba_shipment_id`
- `order_id`
- `charge_type`
- `quantity`
- `amount_usd`
- `posted_date`

---

### 3.2 Organization and Unit Matcher

The matcher connects a charge to the correct upstream evidence.

The primary matching key is:

```
org_id + unit_id
```

This prevents evidence belonging to one organization from being incorrectly associated with another organization.

---

### 3.3 Evidence Retrieval Layer

The evidence retrieval layer searches the available upstream records.

The current evidence sources are:

```
Receiving
   │
   ├── Quantity
   ├── Damage
   ├── Identity
   ├── Quality flags
   └── Photos

Preparation
   │
   ├── Work order
   ├── Preparation requirements
   ├── Packaging checks
   └── Photos

Packing
   │
   ├── Order information
   ├── Observed contents
   ├── Operator verdict
   └── Photos

Returns
   │
   ├── Identity match
   ├── Parts information
   ├── Item condition
   ├── Disposition
   └── Photos
```

---

## 4. Charge-Specific Evidence Check Layer

RecoverIQ does not use one generic rule for every charge.

The evidence checks depend on the charge type.

For example:

```
Lost Inbound
      ↓
Receiving Quantity Check
      ↓
Compare Ordered vs Received
      ↓
PASS / FAIL / UNCERTAIN
```

Another example:

```
Fulfilment Weight-Tier Charge
      ↓
Check Weight / Dimensions / Fee Tier Evidence
      ↓
Evidence Available?
      │
   ┌──┴──┐
  YES    NO
   │      │
   ▼      ▼
Evaluate UNCERTAIN
```

This prevents the system from making unsupported assumptions.

---

## 5. Evidence Verdicts

Each evidence check produces one of three verdicts:

### PASS

The evidence supports the recovery hypothesis.

### FAIL

The evidence contradicts the recovery hypothesis.

### UNCERTAIN

The available evidence is insufficient to reach a reliable conclusion.

The system preserves `UNCERTAIN` instead of converting it into PASS or FAIL.

---

## 6. Decision Engine

The decision engine combines the results of the charge-specific evidence checks.

```
Evidence Checks
       ↓
┌─────────────────────────┐
│   Decision Evaluation   │
└────────────┬────────────┘
             │
       ┌─────┼─────┐
       │     │     │
       ▼     ▼     ▼
   SUPPORT  CONTRADICT  GAP
       │     │     │
       ▼     ▼     ▼
   SUPPORTED CONTRADICTED UNCERTAIN
```

The engine records the reason behind the final outcome rather than producing only a binary answer.

---

## 7. Evidence-Gated Decision Flow

The complete runtime workflow is:

```
1. Capture Charge
       ↓
2. Identify Organization + Unit
       ↓
3. Retrieve Related Evidence
       ↓
4. Verify Evidence Association
       ↓
5. Execute Charge-Specific Checks
       ↓
6. Evaluate Evidence
       ↓
7. Determine Outcome
       ↓
8. Generate Recovery Case File
       ↓
9. Route Uncertain Cases to Human Review
```

---

## 8. Recovery Case File

For each processed charge, the system generates a structured case representation.

The case contains:

```
record_id
schema_version
organization
agent / subject
captured_at
operator
checks[]
outcome
overrides
status
content_hash
trace
```

Each check can contain:

```
check_key
verdict
confidence
detail
model_version
latency_ms
```

The case also records the evidence used to reach the decision.

---

## 9. Traceability Architecture

RecoverIQ maintains an evidence chain from the original charge to the final outcome.

```
Charge
  ↓
Organization + Unit
  ↓
Matched Evidence
  ↓
Evidence Check
  ↓
Check Verdict
  ↓
Decision
  ↓
Recovery Case File
```

This allows a reviewer to inspect **why** a charge was classified as supported, contradicted, or uncertain.

---

## 10. Human Review Boundary

Human review is part of the architecture rather than an exception.

Cases are routed for review when:

- Required evidence is missing.
- Evidence is conflicting.
- The available evidence cannot establish the recovery hypothesis.
- A charge requires information that is not available in the current evidence set.

The automated decision and any human override are represented separately.

```
Automated Decision
        ↓
     UNCERTAIN
        ↓
   Human Review
        ↓
Optional Override
```

---

## 11. Tenant Isolation

RecoverIQ uses organization-aware matching:

```
(org_id, unit_id)
```

Evidence is never matched using `unit_id` alone.

The agent also performs a tenant-isolation self-test during execution.

This provides an additional safeguard against cross-organization evidence contamination.

---

## 12. Deterministic Reasoning Boundary

The current implementation uses a **deterministic evidence-based decision engine**.

It does not make external LLM calls.

The system therefore does not claim that an LLM independently understands or validates the evidence.

Instead, the current implementation uses explicit charge-specific rules and evidence checks.

This makes the decision process inspectable and reproducible.

---

## 13. Frontend Architecture

The frontend is implemented using React and Vite.

```
React Frontend
      │
      ├── Overview
      │
      ├── Charges
      │
      ├── Claim Candidates
      │
      ├── Evidence Sources
      │
      ├── Search / Filters
      │
      └── Recovery Details
                │
                ▼
        Structured Agent Output
```

The frontend provides a visual interface for inspecting charges, decisions, evidence, and recovery candidates.

---

## 14. Evaluation Architecture

RecoverIQ includes a held-out synthetic evaluation workflow.

```
Held-Out Cases
      ↓
Agent Evaluation
      ↓
Reference Comparison
      ↓
Decision Agreement
      ↓
Evaluation Report
```

The evaluation tooling supports:

- Held-out cases
- Reviewer packets
- Reference labels
- Agreement calculation
- Agent evaluation
- Uncertain-case handling

The current evaluation setup uses synthetic reference data. It should not be interpreted as independent human ground truth or real-world reimbursement accuracy.

---

## 15. System Boundary

### Currently Implemented

- Charge ingestion
- Organization-aware unit matching
- Upstream evidence retrieval
- Charge-specific deterministic checks
- PASS / FAIL / UNCERTAIN evidence verdicts
- SUPPORTED / CONTRADICTED / UNCERTAIN outcomes
- Recovery Case Files
- Evidence traceability
- Tenant isolation self-test
- Human-review boundary
- Frontend dashboard
- Held-out synthetic evaluation tooling

### Not Claimed by the Current Implementation

The current implementation does not claim to independently verify:

- External reimbursement policies
- Real-world reimbursement eligibility windows
- Real-world fee schedules
- Real-world Amazon reimbursement outcomes

Such decisions require the relevant authoritative evidence and policy information to be provided to the system.

---

## 16. Trust Boundary

The architecture follows an evidence-first trust model:

```
Evidence Available
       ↓
Evidence Verified
       ↓
Rule Applied
       ↓
Decision Produced
```

If the required evidence is not available:

```
Missing Evidence
       ↓
UNCERTAIN
       ↓
Human Review
```

The system does not treat model confidence as a substitute for missing evidence.

---

## 17. Design Principle

RecoverIQ is built around the following principle:

> **Every recovery decision should be defensible through traceable evidence.**

The architecture therefore prioritizes:

- Evidence over unsupported assumptions
- Explicit uncertainty
- Charge-specific reasoning
- Tenant isolation
- Traceability
- Reproducibility
- Human review for ambiguous cases

**RecoverIQ is not a claim generator. It is an evidence-gated recovery agent.**