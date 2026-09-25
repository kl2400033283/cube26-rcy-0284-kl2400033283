# CLAUDE.md — RecoverIQ Recovery Manager

## 1. Mission

Build RecoverIQ, an evidence-first Recovery Manager for the RCY track.

The system must determine whether a financial charge or reimbursement event is actually supported by available upstream operational evidence.

Core workflow:

Charge
→ Unit
→ Upstream Evidence
→ Evidence Interpretation
→ Decision
→ Claim / Review

The goal is not to maximize the number of claims.

The goal is to maximize defensible claims supported by traceable evidence.

---

## 2. Scope

RecoverIQ is responsible for:

- Reading recovery charges and reimbursement events.
- Matching charges to the correct unit.
- Reading evidence produced by upstream Managers.
- Interpreting what the available evidence proves.
- Detecting supporting evidence.
- Detecting contradictory evidence.
- Detecting missing or insufficient evidence.
- Identifying evidence gaps.
- Identifying duplicate or already-accounted-for charges when supported by the data.
- Producing a structured recovery decision.
- Producing a traceable evidence chain.
- Producing a recoverable dollar amount only when supported.
- Sending ambiguous cases for human review.

RecoverIQ is NOT responsible for:

- Replacing Receiving Manager logic.
- Replacing Prep Manager logic.
- Replacing Pack Manager logic.
- Replacing Returns Manager logic.
- Re-running upstream image classification unnecessarily.
- Inventing operational evidence.
- Inventing financial amounts.
- Guessing missing evidence.
- Hiding contradictions.
- Converting uncertainty into a confident claim.

---

## 3. Authoritative Sources

Always use the official repository data, rules, schemas, and evidence contract as authoritative.

Do not invent requirements from memory.

When a requirement, fee amount, evidence field, or rule exists in the repository or official documentation:

1. Retrieve it.
2. Use the authoritative value.
3. Preserve its meaning.
4. Do not silently replace it with an inferred value.

Sample CSV values and repository data must be treated according to the official repository rules.

If two authoritative sources contradict each other:

- Do not silently choose one.
- Preserve the contradiction.
- Surface it as a finding.
- Send the affected case for review where appropriate.

---

## 4. Evidence-First Principle

Evidence must come before the claim decision.

For every recommended recovery claim, the system should be able to answer:

1. What was the original charge?
2. Which unit does the charge belong to?
3. Which upstream evidence was inspected?
4. What does that evidence prove?
5. What evidence contradicts the claim?
6. What evidence is missing?
7. Why was the final decision reached?
8. What amount is being claimed?
9. Why is that amount supported?

The preferred traceability chain is:

Charge
→ Unit
→ Upstream Evidence
→ Evidence Interpretation
→ Decision
→ Supporting Evidence

No claim should exist without a traceable evidence path.

---

## 5. Evidence Contract

The official evidence contract is the baseline.

Do not redefine, remove, or silently change official contract fields.

Preserve required information such as:

- record identity
- schema version
- organisation/client identity
- agent and subject information
- capture timestamp
- operator information
- checks
- verdict
- confidence
- detail
- model version
- latency
- outcome
- overrides
- status
- content hash

Use the repository's actual contract/schema when implementing.

Recovery-specific fields may be added only when they do not break the official contract.

---

## 6. Decision Semantics

Recovery decisions must distinguish between:

- evidence that supports a claim
- evidence that contradicts a claim
- evidence that is insufficient
- evidence that requires human review

Do not force ambiguous cases into a positive claim.

UNCERTAIN is a first-class outcome.

UNCERTAIN does NOT mean:

"probably supported"

UNCERTAIN means the available evidence does not justify a definitive automated decision.

If Recovery uses internal decision labels such as:

- SUPPORTED
- CONTRADICTED
- UNCERTAIN
- SILENT

they must be clearly defined and mapped to the official evidence/output contract rather than replacing the official contract semantics.

---

## 7. AI / Model Usage

Use deterministic logic whenever the decision can be made reliably from structured data.

Preferred processing order:

1. Parse input.
2. Validate input.
3. Match the charge to a unit.
4. Retrieve relevant evidence.
5. Apply deterministic checks.
6. Detect contradictions and missing evidence.
7. Use an AI/model only where interpretation is genuinely required.
8. Produce a structured decision.
9. Attach evidence supporting the decision.
10. Send unresolved ambiguity to review.

Do not use an LLM as the source of truth.

The LLM may interpret evidence.

The LLM must not manufacture evidence.

---

## 8. Model Call Efficiency

When model reasoning is required:

- Batch checks for a unit into one model call.
- Do NOT make one model call per individual check.
- Reuse retrieved evidence where possible.
- Avoid unnecessary repeated inference.
- Record model version and latency.
- Keep model-dependent logic isolated from deterministic business rules.

The official repository specifically requires one model call per unit carrying all checks rather than one call per check.

---

## 9. Fail-Open Behavior

Model failure must not destroy the underlying evidence record.

If a model:

- times out
- returns an error
- produces invalid output
- becomes unavailable

the system must:

1. Preserve the original capture/evidence.
2. Preserve the recovery case.
3. Record the failure.
4. Mark the case appropriately as pending/review according to the official workflow.
5. Avoid inventing a decision.
6. Allow the operator/workflow to continue.

A model failure should create a reviewable state, not silently disappear.

---

## 10. Tenancy Isolation

Organisation boundaries are mandatory.

All persisted data must remain scoped to the correct organisation/client.

Do not allow one organisation to:

- query another organisation's rows
- retrieve another organisation's evidence
- retrieve another organisation's images
- access another organisation's recovery cases

Do not rely only on application-level filtering.

Where the repository requires row-level security:

- enable it
- force it
- scope it to organisation identity
- test cross-organisation access

The provided sample data contains multiple organisations and should be used to test isolation.

---

## 11. Overrides

Human overrides are data.

When an operator disagrees with an automated decision, preserve:

- original verdict
- new verdict
- reason
- operator information when available
- timestamp

Never silently overwrite the original automated decision.

The system must make it possible to understand:

Agent Decision
→ Human Override
→ Reason

---

## 12. Traceability Requirements

Every important recovery decision must contain enough information to reconstruct the reasoning.

At minimum, preserve:

- charge identifier
- unit identifier
- evidence record identifiers
- relevant check results
- evidence interpretation
- decision
- recoverable amount
- reason
- uncertainty/review status where applicable

A reviewer should be able to move from:

Claim
→ Charge
→ Unit
→ Evidence
→ Evidence Detail
→ Decision

without guessing.

---

## 13. Contradictions

Contradictory evidence must never be hidden.

If two relevant evidence records disagree:

- preserve both records
- identify the contradiction
- explain the conflict
- avoid pretending the conflict does not exist
- route the case for review when the contradiction prevents a defensible decision

Contradictions are findings, not implementation errors to be silently ignored.

---

## 14. Missing Evidence

Missing evidence must be represented explicitly.

If a required piece of evidence is unavailable:

- do not fabricate it
- do not assume the missing evidence exists
- do not automatically approve the claim
- record the evidence gap
- use UNCERTAIN/review behavior when appropriate

Absence of evidence is not evidence of support.

---

## 15. Recovery Claim Safety

A recommended claim must be supported by evidence.

Before recommending a claim, verify:

- correct charge
- correct unit
- relevant evidence
- evidence interpretation
- applicable requirement/rule
- recoverable amount
- absence of unresolved contradiction

If these cannot be established, prefer review over an unsupported claim.

---

## 16. Evaluation

Never claim that the system is accurate without measurement.

Evaluation must report actual results from the evaluation data.

Where applicable, measure:

- Claim Precision
- Claim Recall
- Unsupported Claim Rate
- UNCERTAIN Rate
- Evidence Link Accuracy
- Decision Accuracy
- False Positive Rate
- False Negative Rate
- Latency
- Model/API cost where measurable

Report the evaluation methodology.

Do not cherry-pick only successful examples.

Include failure cases and explain them.

An honest measured result is more valuable than an unsupported accuracy claim.

---

## 17. Testing

Tests should cover at least:

### Supported case
Evidence clearly supports recovery.

### Contradicted case
Evidence clearly indicates the charge should not be claimed.

### Insufficient evidence
Required evidence is missing.

### Uncertain case
Evidence is ambiguous or conflicting.

### Unit mismatch
Charge cannot be safely connected to the expected unit.

### Duplicate charge
The same recovery opportunity appears more than once.

### Multiple evidence records
Several upstream records must be combined.

### Model failure
Model timeout/error must preserve the case and create a reviewable state.

### Organisation isolation
One organisation must not access another organisation's data.

---

## 18. Engineering Style

Prefer:

- small modules
- explicit interfaces
- deterministic business logic
- typed/structured data
- clear error handling
- testable functions
- reproducible evaluation
- meaningful logging
- traceable decisions

Avoid:

- unnecessary frameworks
- unnecessary microservices
- giant files
- hidden global state
- hard-coded claims
- magic numbers
- duplicated logic
- untraceable AI decisions

Build the smallest system that demonstrates the complete Recovery workflow correctly.

---

## 19. Output Requirements

The Recovery Manager should produce structured output that downstream systems can consume.

Prefer machine-readable JSON in addition to human-readable explanations.

A recovery result should conceptually contain:

- case/charge identity
- unit identity
- decision
- claimability
- amount
- reason
- supporting evidence
- contradictory evidence
- missing evidence
- review status
- traceability information

The exact schema must follow the official repository contract.

---

## 20. UX Requirements

The interface should make the decision understandable.

A reviewer should be able to see:

INPUT
→ MATCHED UNIT
→ EVIDENCE
→ INTERPRETATION
→ DECISION
→ CLAIM / REVIEW

Important evidence should be visible next to the decision it supports.

Do not create a generic chatbot UI.

The UI exists to make the Recovery decision and evidence trace inspectable.

---

## 21. Security

Never commit:

- API keys
- passwords
- access tokens
- secrets
- `.env` files containing credentials

Use environment variables for secrets.

Never expose credentials in logs, screenshots, README files, or demo recordings.

---

## 22. Repository Rules

Work only inside:

submissions/kl2400033283/

Do NOT modify:

- main
- another participant's folder
- another participant's branch
- shared repository data
- top-level files unless explicitly permitted

The branch must remain:

kl2400033283

All changes must eventually reach main through a pull request.

Never push directly to main.

---

## 23. AI Coding Rules

When using an AI coding assistant:

- Read existing code before modifying it.
- Do not overwrite working code unnecessarily.
- Do not invent repository files or schemas.
- Do not assume an API exists without checking.
- Do not fabricate test results.
- Do not fabricate evaluation metrics.
- Do not claim deployment unless it was actually deployed.
- Do not remove evidence to make evaluation look better.
- Explain significant architectural decisions in documentation.
- Keep changes inside the participant folder.

---

## 24. Definition of Done

A Recovery feature is not complete merely because it runs.

It is complete when:

- input is understood
- evidence is retrieved
- the correct unit is identified
- decision logic is applied
- uncertainty is preserved
- contradictions are visible
- output is structured
- evidence is traceable
- errors are handled
- tests exist
- evaluation can measure the behavior
- another person can reproduce the workflow

The final system should be:

Focused.
Measurable.
Traceable.
Defensible.
Reproducible.

---

## Core Principle

Evidence first.

Decision second.

Claim only what the evidence can defend.