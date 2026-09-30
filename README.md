# RecoverIQ — Evidence-First Recovery Manager

## Overview

RecoverIQ is a Recovery Manager built for the CUBE Buildathon's RCY track. It reads recovery-related charges and works out, for each one, whether the available upstream evidence **supports**, **contradicts**, or is simply **too thin** to say either way.

The guiding idea is simple: don't try to maximize the number of claims you can raise — maximize the number you can actually defend. Every charge is treated as a hypothesis ("this fee is legitimate") that the evidence either backs up or pushes back against.

> **Design principle:** Don't maximize claims. Maximize defensible claims.

## The problem

Recovery work means matching a fee or reimbursement charge against operational records scattered across receiving, prep, packing, and returns. In practice that's messy:

- Charges often don't have enough evidence behind them to act on.
- What evidence *does* exist is spread across several upstream sources.
- Different charge types need completely different validation logic — a lost-inbound charge and a warehouse-damage charge aren't checked the same way.
- Missing or conflicting evidence can easily lead to a wrong call if you're not careful.
- A recovery decision is only useful if someone can trace *why* it was made.
- Not every case is clear-cut, and forcing an ambiguous one into PASS or FAIL just hides the ambiguity instead of solving it.

RecoverIQ is built around an evidence-gated workflow to deal with all of this directly rather than paper over it.

## What it actually does

1. Ingests the charge records from a fee report.
2. Works out which organization and unit each charge belongs to.
3. Retrieves the upstream evidence for that specific org/unit pair.
4. Runs the check that's appropriate for that charge type.
5. Reads off whether the evidence supports, contradicts, or simply doesn't cover the charge.
6. Produces a structured recovery decision.
7. Records exactly which evidence the decision rests on.
8. Routes anything ambiguous to human review instead of guessing.
9. Writes out a traceable Recovery Case File for the whole thing.

## The three outcomes

Every charge lands on exactly one of three outcomes:

**SUPPORTED** — the evidence backs the recovery hypothesis; there's a defensible claim here.

**CONTRADICTED** — the evidence gives a clear reason *against* recovery.

**UNCERTAIN** — the evidence isn't enough to say either way, and isn't treated as a fallback or a failure state — it's a legitimate, first-class result in its own right, not something silently converted into a PASS or FAIL.

## The evidence-first flow

```text
Charge Intake
↓
Organization + Unit Matching
↓
Evidence Retrieval
↓
Evidence Verification
↓
Charge-Specific Checks
↓
SUPPORT / CONTRADICT / GAP
↓
Decision Engine
↓
Recovery / Reject / Human Review
↓
Traceable Recovery Case File
```

## Where the evidence comes from

RecoverIQ pulls from four upstream sources, each capturing something different about a unit's journey:

- **Receiving** — quantity ordered vs. received, damage notes, identity matching, quality flags, photos, and who logged it.
- **Prep** — the work order, what prep was required, polybag status, warning labels, expiry/handling info, and photos.
- **Packing** — order details, what was actually observed in the box, the operator's verdict, and photos.
- **Returns** — the ordered SKU/ASIN, identity match, missing parts, observed condition, and how the operator disposed of it.

## How different charge types get checked

Not every charge is evaluated the same way — that's kind of the point:

- **Lost inbound** — compares received quantity against ordered quantity to see if a shortfall actually happened.
- **Inbound defect** — looks at receiving (and related) evidence for anything documenting defect or damage.
- **Damaged in warehouse** — checks whatever operational evidence exists for support or contradiction of the warehouse-damage claim specifically.
- **Refund issued, item not returned** — checks return evidence for whether the item actually came back, and whether its identity matches.
- **Fulfilment fee (weight tier)** — needs authoritative weight, dimension, or fee-tier evidence to make a call. If that evidence isn't there, the charge stays UNCERTAIN rather than being estimated.

## Inside a single check

Each individual evidence check returns a `PASS`, `FAIL`, or `UNCERTAIN`, along with:

- a check key
- the verdict itself
- a confidence score
- a plain-language explanation
- the model/policy version that produced it
- processing latency
- the specific evidence record it relied on

That's what lets a final decision be walked back, step by step, to the evidence that actually produced it.

## The Recovery Case File

Every charge that gets processed produces a structured case containing:

`record_id`, `schema_version`, organization, agent/subject, `captured_at`, operator, `checks[]`, `outcome`, `overrides`, `status`, `content_hash`, and a full `trace`.

The trace itself connects the original charge → the org/unit it belongs to → the evidence records that were evaluated → the evidence that actually drove the decision → the final outcome.

## Traceability, end to end

The intent is that a reviewer can walk backward through a decision without hitting a dead end:

```text
Recovery Decision → Decision Explanation → Evidence Check → Upstream Evidence → Original Record
```

Nothing here is meant to be an unexplained output — every decision should be inspectable.

## Where humans come in

RecoverIQ doesn't force a call when the evidence genuinely isn't enough. Anything with missing, conflicting, or insufficient evidence comes back UNCERTAIN and can be routed to a human reviewer. When a human does override a decision, that override is recorded explicitly — it doesn't just quietly replace the original automated call.

## Tenant isolation

Evidence is always matched on **org_id + unit_id together**, never unit_id alone. Unit IDs aren't guaranteed unique across organizations, so matching on unit_id by itself would risk one org's evidence leaking into another org's charge. The agent also runs a tenant-isolation self-test on every execution to catch this directly rather than just hoping it holds.

## Current fixture run

On the synthetic fixture currently included:

| | |
|---|---|
| Charge records | 61 |
| Units | 44 |
| Total charged | $202.70 |
| Supported | 12 |
| Contradicted | 5 |
| Uncertain | 44 |
| Recovery identified | $6.50 |

These numbers describe agent behavior on a synthetic dataset — they're meant to demonstrate how the workflow behaves, not to represent real-world reimbursement accuracy.

## Evaluation

RecoverIQ includes a held-out evaluation workflow to check decision consistency on cases the agent hasn't seen before. It supports held-out cases, reviewer packets, synthetic reference labels, agreement calculation, and full agent evaluation, with explicit handling of uncertain cases throughout.

**Important caveat:** the current evaluation uses synthetic reference data, not independently labelled human ground truth. It should be read as a protocol check on the evaluation methodology itself, not as validated real-world accuracy.

## Frontend

A React + Vite frontend is included for inspecting the workflow: a recovery overview, charge listing, claim candidates, evidence sources, a recovery snapshot, search/filtering, CSV upload, and full evidence/decision inspection per case.

**Live deployment:** https://cube26-rcy-0284-kl2400033283.vercel.app

## Project structure

```text
submissions/kl2400033283/
│
├── agent/
│   └── recovery_agent.py
│
├── data/
│   └── ...
│
├── eval/
│   ├── generate_eval_cases.py
│   ├── evaluate_agent.py
│   ├── calculate_agreement.py
│   └── ...
│
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── ...
│
├── README.md
├── ARCHITECTURE.md
└── AGENT_GUIDE.md
```

## Running it

**Agent:**
```bash
python agent/recovery_agent.py
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev      # dev server
npm run build    # production build
```

## Stack

**Backend / agent:** Python, deterministic decision engine, CSV-based evidence processing, structured JSON case files.

**Frontend:** React, Vite, JavaScript, CSS.

**Deployment:** Vercel.

## Trust boundary

RecoverIQ is deliberately conservative. It runs on deterministic, evidence-based rules — there are no external LLM calls anywhere in the decision path. It doesn't claim to independently verify real-world reimbursement policy, fee schedules, or eligibility windows unless the evidence for that is actually provided to it.

In practice, that means confidence never overrides missing evidence. If the evidence isn't there, the answer is UNCERTAIN, and the final call goes to a human.

## Why it's built this way

The whole system comes back to one rule: **every recovery claim has to be defensible through evidence.**

The goal was never to squeeze out the maximum number of claims. It was to surface the recovery opportunities that can actually be explained, inspected, traced, and defended — the ones worth standing behind.
