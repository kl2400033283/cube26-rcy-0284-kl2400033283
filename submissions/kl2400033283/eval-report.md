# Recovery Manager — Evaluation Report

## 1. Evaluation Objective

The Recovery Manager evaluates fee and reimbursement charges against upstream operational evidence and determines whether a recovery claim is:

- `SUPPORTED` — sufficient evidence contradicts the charge and supports recovery.
- `CONTRADICTED` — evidence supports the charge, so recovery is not recommended.
- `UNCERTAIN` — available evidence is insufficient to make a safe automated decision and human review is required.

The system follows an evidence-first approach: it does not treat model confidence as a substitute for missing authoritative evidence.

---

## 2. Evaluation Data

The supplied reference dataset contains:

- 61 synthetic fee-report records.
- Receiving evidence.
- Preparation evidence.
- Packing evidence.
- Returns evidence.

The reference data is explicitly synthetic and does not contain independently labelled ground truth.

The repository documentation states that the separate evaluation set consists of 50 previously unseen units labelled independently by two humans. That evaluation set is not included in the supplied repository data used for this fixture run.

Therefore, this report does **not** claim an accuracy or claim-precision score from the 61 fixture records.

---

## 3. Fixture Run Results

### Overall Results

| Metric | Result |
|---|---:|
| Total cases processed | 61 |
| Total charged amount | $202.70 |
| Recommended recovery | $6.50 |
| Amount pending review | $192.70 |
| SUPPORTED decisions | 12 |
| CONTRADICTED decisions | 5 |
| UNCERTAIN decisions | 44 |
| Uncertainty rate | 72.13% |

These values describe the agent's behaviour on the supplied synthetic fixture.

They are operational measurements and are not accuracy or claim-precision measurements.

---

## 4. Results by Charge Type

| Charge Type | Cases | Amount (USD) | SUPPORTED | CONTRADICTED | UNCERTAIN |
|---|---:|---:|---:|---:|---:|
| fulfilment_fee_weight_tier | 42 | 178.20 | 0 | 0 | 42 |
| lost_inbound | 5 | 0.00 | 3 | 2 | 0 |
| inbound_defect_fee | 9 | 10.50 | 5 | 3 | 1 |
| refund_issued_item_not_returned | 4 | 0.00 | 4 | 0 | 0 |
| damaged_in_warehouse | 1 | 14.00 | 0 | 0 | 1 |
| **Total** | **61** | **202.70** | **12** | **5** | **44** |

---

## 5. Uncertainty Handling

Uncertainty is treated as a first-class outcome rather than being forced into PASS or FAIL.

For example, fulfilment fee weight-tier cases are marked `UNCERTAIN` because the supplied fixture does not contain:

- authoritative measured package weight,
- authoritative package dimensions,
- an authoritative fee-tier schedule.

The agent therefore does not substitute SKU, quantity, or charged amount for missing authoritative evidence.

Similarly, warehouse-damage recovery is conservative when the available evidence does not establish that the damage occurred during the warehouse stage.

---

## 6. Evidence Traceability

Each Recovery Case File maintains a trace from:

```text
Charge
  ↓
Unit
  ↓
Upstream Evidence
  ↓
Evidence Interpretation
  ↓
Claim Decision
  ↓
Supporting Evidence