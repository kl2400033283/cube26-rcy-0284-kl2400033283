"""
RecoverIQ — Recovery Manager
Face 3: Headless evidence-first agent.

Purpose
-------
Evaluate recovery charges against upstream operational evidence.

Pipeline
-------
1. Load fee report.
2. Load all four upstream evidence sources.
3. Join evidence by org_id + unit_id (tenant-scoped).
4. Apply deterministic, charge-specific checks.
5. Produce traceable Recovery Case Files.
6. Produce aggregate evaluation metrics.
7. Write machine-readable JSON.

Important
---------
The supplied fixture data is synthetic/dummy data.
The decision policies implemented here are fixture-policy
prototypes and are NOT real Amazon reimbursement rules.

Evidence verdict semantics
---------------------------
PASS      = evidence supports the charge existing.
FAIL      = evidence contradicts the charge.
UNCERTAIN = evidence is missing, ambiguous, or insufficient.

Recovery decision semantics
----------------------------
SUPPORTED    = evidence contradicts the charge, so recovery may
               be supportable.
CONTRADICTED = evidence supports the charge, so recovery is not
               supportable from the available evidence.
UNCERTAIN    = evidence is insufficient; send for review.

Conservative principle
----------------------
The agent must prefer UNCERTAIN over inventing evidence.
AI/model confidence must never override missing authoritative
evidence.
"""

import csv
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone


# ============================================================
# PROJECT PATHS
# ============================================================

ROOT = Path(__file__).resolve().parents[3]

DATA_DIR = ROOT / "data"
UPSTREAM_DIR = DATA_DIR / "upstream"

FEE_FILE = DATA_DIR / "fee_report_sample.csv"

UPSTREAM_FILES = {
    "receiving": UPSTREAM_DIR / "receiving_sample.csv",
    "prep": UPSTREAM_DIR / "prep_sample.csv",
    "pack": UPSTREAM_DIR / "pack_sample.csv",
    "returns": UPSTREAM_DIR / "returns_sample.csv",
}

OUTPUT_DIR = Path(__file__).resolve().parent / "outputs"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

OUTPUT_FILE = OUTPUT_DIR / "recovery_cases.json"


# ============================================================
# VERSION / CONTRACT METADATA
# ============================================================

AGENT_NAME = "RecoverIQ Recovery Manager"
AGENT_VERSION = "0.3.0"
EVIDENCE_SCHEMA_VERSION = "1.0"

MODEL_VERSION = "deterministic-fixture-policy-v0.3"


# ============================================================
# BASIC UTILITIES
# ============================================================

def utc_now():
    """Return current UTC timestamp."""
    return datetime.now(timezone.utc).isoformat()


def load_csv(path):
    """Load a CSV file into a list of dictionaries."""
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def clean_value(value):
    """Normalize empty CSV values."""
    if value is None:
        return None

    value = str(value).strip()

    if value == "":
        return None

    return value


def group_by_org_and_unit(records):
    """Group evidence records by org_id and unit_id.

    Tenant isolation rule:
    evidence is only retrievable when both the organization and
    unit identifier match the charge being evaluated.
    """
    grouped = {}

    for record in records:
        org_id = clean_value(record.get("org_id"))
        unit_id = clean_value(record.get("unit_id"))

        if not org_id or not unit_id:
            continue

        grouped.setdefault((org_id, unit_id), []).append(record)

    return grouped


def safe_float(value, default=0.0):
    """Safely convert a value to float."""
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def safe_int(value):
    """Safely convert a value to integer."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


# ============================================================
# EVIDENCE TRACEABILITY
# ============================================================

def evidence_reference(source, record):
    """
    Convert a raw upstream record into a traceable evidence reference.

    Only references information actually present in the fixture.
    """

    photo_refs = clean_value(record.get("photo_refs"))

    if photo_refs:
        photos = [
            item.strip()
            for item in photo_refs.split("|")
            if item.strip()
        ]

        # Some fixtures may use comma-separated references.
        if len(photos) == 1 and "," in photos[0]:
            photos = [
                item.strip()
                for item in photos[0].split(",")
                if item.strip()
            ]
    else:
        photos = []

    return {
        "source": source,
        "record_id": clean_value(record.get("record_id")),
        "unit_id": clean_value(record.get("unit_id")),
        "org_id": clean_value(record.get("org_id")),
        "captured_at": clean_value(record.get("captured_at")),
        "operator_id": clean_value(record.get("operator_id")),
        "photo_refs": photos,
    }


def evidence_summary(evidence):
    """Create a compact, traceable summary of all upstream evidence."""

    summary = []

    for source, records in evidence.items():
        for record in records:
            summary.append(
                evidence_reference(source, record)
            )

    return summary


def evidence_refs_for(source, records):
    """Create evidence references for records used by a check."""

    return [
        evidence_reference(source, record)
        for record in records
    ]


def content_hash(payload):
    """Create a deterministic SHA-256 hash for a JSON-serializable payload."""
    canonical = json.dumps(
        payload,
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def tenant_isolation_self_test():
    """Prove that identical unit_ids remain isolated by org_id."""
    records = [
        {
            "record_id": "ISO-ALPHA-1",
            "org_id": "org_demo_alpha",
            "unit_id": "UNIT-ISOLATION",
        },
        {
            "record_id": "ISO-BRAVO-1",
            "org_id": "org_demo_bravo",
            "unit_id": "UNIT-ISOLATION",
        },
    ]

    grouped = group_by_org_and_unit(records)

    alpha = grouped.get(("org_demo_alpha", "UNIT-ISOLATION"), [])
    bravo = grouped.get(("org_demo_bravo", "UNIT-ISOLATION"), [])

    if [item.get("record_id") for item in alpha] != ["ISO-ALPHA-1"]:
        raise AssertionError("Tenant isolation failed for org_demo_alpha.")

    if [item.get("record_id") for item in bravo] != ["ISO-BRAVO-1"]:
        raise AssertionError("Tenant isolation failed for org_demo_bravo.")

    if grouped.get(("org_demo_alpha", "UNIT-ISOLATION")) == grouped.get(
        ("org_demo_bravo", "UNIT-ISOLATION")
    ):
        raise AssertionError("Cross-organization evidence leakage detected.")

    return True


# ============================================================
# CHECK RESULT BUILDER
# ============================================================

def make_check(
    check_key,
    verdict,
    confidence,
    detail,
    evidence_refs=None,
    latency_ms=0,
):
    """
    Build a normalized evidence-check result.

    This follows the required evidence contract concepts:
    check key, verdict, confidence, detail, model version,
    latency, and evidence references.
    """

    return {
        "check_key": check_key,
        "verdict": verdict,
        "confidence": round(float(confidence), 3),
        "detail": detail,
        "model_version": MODEL_VERSION,
        "latency_ms": latency_ms,
        "evidence_refs": evidence_refs or [],
    }


# ============================================================
# RECEIVING CHECK
# ============================================================

def receiving_check(records):
    """
    Evaluate receiving evidence for inbound-defect charges.

    PASS:
        Receiving evidence contains an observed defect/damage/quality
        issue that supports the charge.

    FAIL:
        Receiving evidence is clean and contradicts the charge.

    UNCERTAIN:
        Evidence is missing or identity is ambiguous.
    """

    if not records:
        return make_check(
            "receiving_evidence",
            "UNCERTAIN",
            0.0,
            "No receiving evidence is available for this unit.",
        )

    # The fixture normally has one receiving record per unit.
    record = records[0]

    carton_damage = clean_value(record.get("carton_damage"))
    unit_damage = clean_value(record.get("unit_damage"))
    quality_flags = clean_value(record.get("quality_flags"))
    identity_match = clean_value(record.get("identity_match"))

    refs = evidence_refs_for("receiving", records)

    if identity_match == "uncertain":
        return make_check(
            "receiving_evidence",
            "UNCERTAIN",
            0.45,
            "Receiving identity match is uncertain, so the evidence "
            "cannot be safely attributed to the charged unit.",
            refs,
        )

    observed_issue = (
        carton_damage not in (None, "", "none")
        or unit_damage not in (None, "", "none")
        or quality_flags not in (None, "")
    )

    if observed_issue:
        return make_check(
            "receiving_evidence",
            "PASS",
            0.90,
            "Receiving evidence contains an observed carton damage, "
            "unit damage, or quality issue that supports an inbound "
            "defect condition.",
            refs,
        )

    return make_check(
        "receiving_evidence",
        "FAIL",
        0.90,
        "Receiving evidence shows no recorded carton damage, "
        "unit damage, or quality flag.",
        refs,
    )


# ============================================================
# LOST INBOUND CHECK
# ============================================================

def lost_inbound_check(records):
    """
    Compare ordered and received quantities.

    PASS:
        received < ordered.

    FAIL:
        received == ordered.

    UNCERTAIN:
        invalid quantities, missing evidence, or received > ordered.
    """

    if not records:
        return make_check(
            "lost_inbound_quantity",
            "UNCERTAIN",
            0.0,
            "No receiving evidence is available.",
        )

    record = records[0]

    ordered = safe_int(record.get("qty_ordered"))
    received = safe_int(record.get("qty_received"))

    refs = evidence_refs_for("receiving", records)

    if ordered is None or received is None:
        return make_check(
            "lost_inbound_quantity",
            "UNCERTAIN",
            0.0,
            "Receiving quantity fields are missing or invalid.",
            refs,
        )

    if received < ordered:
        shortage = ordered - received

        return make_check(
            "lost_inbound_quantity",
            "PASS",
            0.95,
            (
                f"Receiving evidence records {received} units received "
                f"against {ordered} ordered, indicating a shortage of "
                f"{shortage} units."
            ),
            refs,
        )

    if received == ordered:
        return make_check(
            "lost_inbound_quantity",
            "FAIL",
            0.95,
            (
                f"Receiving evidence records the full ordered quantity "
                f"({received}/{ordered}), contradicting a lost-inbound "
                f"charge."
            ),
            refs,
        )

    return make_check(
        "lost_inbound_quantity",
        "UNCERTAIN",
        0.40,
        (
            f"Received quantity ({received}) exceeds ordered quantity "
            f"({ordered}); the fixture does not define how to interpret "
            f"this condition."
        ),
        refs,
    )


# ============================================================
# RETURN CHECK
# ============================================================

def return_check(records):
    """
    Evaluate return evidence for a
    refund-issued-item-not-returned charge.

    FAIL:
        Matching return evidence exists.

    UNCERTAIN:
        Return evidence is missing or identity is ambiguous.

    A missing return record is NOT treated as proof that the item
    was not returned.
    """

    if not records:
        return make_check(
            "return_evidence",
            "UNCERTAIN",
            0.0,
            (
                "No return evidence is available. Missing evidence "
                "cannot establish that the item was not returned."
            ),
        )

    refs = evidence_refs_for("returns", records)

    # Check all available records rather than silently assuming
    # the first record is always the correct one.
    for record in records:
        identity = clean_value(record.get("identity_match"))

        if identity == "yes":
            return make_check(
                "return_evidence",
                "FAIL",
                0.90,
                (
                    "A return record exists and the returned item "
                    "identity matches the ordered SKU."
                ),
                refs,
            )

        if identity == "uncertain":
            return make_check(
                "return_evidence",
                "UNCERTAIN",
                0.45,
                "Return evidence exists but identity matching is uncertain.",
                refs,
            )

    return make_check(
        "return_evidence",
        "UNCERTAIN",
        0.50,
        (
            "Return evidence exists, but the available identity "
            "information does not establish a reliable match."
        ),
        refs,
    )


# ============================================================
# WAREHOUSE DAMAGE CHECK
# ============================================================

def warehouse_damage_check(evidence):
    """
    Evaluate warehouse-damage attribution conservatively.

    Important:
    Clean receiving/prep evidence does NOT prove warehouse damage.
    Likewise, damage recorded during receiving does not prove that
    the damage occurred in the warehouse.

    Therefore the fixture requires direct downstream attribution
    before supporting this charge.

    If the available evidence cannot establish timing/location of
    damage, return UNCERTAIN.
    """

    receiving = evidence.get("receiving", [])
    prep = evidence.get("prep", [])
    pack = evidence.get("pack", [])
    returns = evidence.get("returns", [])

    refs = []

    refs.extend(evidence_refs_for("receiving", receiving))
    refs.extend(evidence_refs_for("prep", prep))
    refs.extend(evidence_refs_for("pack", pack))
    refs.extend(evidence_refs_for("returns", returns))

    # We deliberately do not infer warehouse attribution merely
    # from the existence of a damage flag.
    #
    # The current fixture does not provide a formal authoritative
    # warehouse-damage attribution field.

    return make_check(
        "warehouse_damage_attribution",
        "UNCERTAIN",
        0.0,
        (
            "The available fixture evidence does not provide an "
            "authoritative timestamp/location attribution proving "
            "that damage occurred in the warehouse. Damage or clean "
            "status in receiving/prep alone is insufficient to make "
            "this attribution."
        ),
        refs,
    )


# ============================================================
# WEIGHT-TIER CHECK
# ============================================================

def weight_tier_check(evidence):
    """
    Evaluate fulfilment fee weight-tier evidence.

    The current fixture does not contain authoritative measured
    weight/dimension data or an authoritative fee-tier schedule.

    Therefore this check remains UNCERTAIN.
    """

    refs = []

    for source, records in evidence.items():
        refs.extend(evidence_refs_for(source, records))

    return make_check(
        "weight_tier_evidence",
        "UNCERTAIN",
        0.0,
        (
            "The supplied upstream fixture does not contain "
            "authoritative measured package weight/dimensions or "
            "the authoritative fee-tier schedule required to "
            "validate this charge. SKU, quantity, or charged amount "
            "must not be used as a substitute."
        ),
        refs,
    )


# ============================================================
# CHARGE ANALYSIS
# ============================================================

def analyse_charge(charge, evidence):
    """
    Apply charge-specific deterministic policies.

    Evidence verdict:
        PASS      = supports charge
        FAIL      = contradicts charge
        UNCERTAIN = insufficient evidence
    """

    charge_type = clean_value(charge.get("charge_type"))

    if charge_type == "inbound_defect_fee":
        return [
            receiving_check(
                evidence.get("receiving", [])
            )
        ]

    if charge_type == "lost_inbound":
        return [
            lost_inbound_check(
                evidence.get("receiving", [])
            )
        ]

    if charge_type == "refund_issued_item_not_returned":
        return [
            return_check(
                evidence.get("returns", [])
            )
        ]

    if charge_type == "fulfilment_fee_weight_tier":
        return [
            weight_tier_check(evidence)
        ]

    if charge_type == "damaged_in_warehouse":
        return [
            warehouse_damage_check(evidence)
        ]

    return [
        make_check(
            "charge_type_support",
            "UNCERTAIN",
            0.0,
            f"Unknown or unsupported charge type: {charge_type}",
        )
    ]


# ============================================================
# RECOVERY DECISION
# ============================================================

def derive_recovery_decision(checks):
    """
    Convert evidence verdicts into Recovery-level decisions.

    IMPORTANT:
    This is intentionally separate from the evidence contract.

    Evidence PASS:
        evidence supports the charge
        -> recovery claim is CONTRADICTED.

    Evidence FAIL:
        evidence contradicts the charge
        -> recovery claim is SUPPORTED.

    Evidence UNCERTAIN:
        insufficient evidence
        -> recovery decision is UNCERTAIN.
    """

    if not checks:
        return "UNCERTAIN"

    verdicts = [
        check.get("verdict")
        for check in checks
    ]

    # Conservative rule:
    # any uncertainty prevents automatic claim support.
    if "UNCERTAIN" in verdicts:
        return "UNCERTAIN"

    # All checks contradict the charge.
    if all(verdict == "FAIL" for verdict in verdicts):
        return "SUPPORTED"

    # At least one check supports the charge.
    if any(verdict == "PASS" for verdict in verdicts):
        return "CONTRADICTED"

    return "UNCERTAIN"


# ============================================================
# CASE BUILDING
# ============================================================

def build_case(charge, evidence):
    """Build one complete Recovery Case File."""

    checks = analyse_charge(
        charge,
        evidence
    )

    decision = derive_recovery_decision(checks)

    amount = safe_float(
        charge.get("amount_usd"),
        0.0
    )

    claimable = decision == "SUPPORTED"

    generated_at = utc_now()

    reason = " ".join(
        check.get("detail", "")
        for check in checks
    )

    all_evidence = evidence_summary(evidence)

    supporting_evidence = []

    for check in checks:
        supporting_evidence.extend(
            check.get("evidence_refs", [])
        )

    outcome_status = (
        "pending_review"
        if decision == "UNCERTAIN"
        else "resolved"
    )

    outcome = {
        "recovery_decision": decision,
        "claimable": claimable,
        "amount_usd": amount if claimable else 0.0,
        "reason": reason,
        "status": outcome_status,
        "decided_by": "deterministic_rule_engine",
        "decided_at": generated_at,
    }

    case = {
        "record_id": charge.get("line_id"),
        "schema_version": EVIDENCE_SCHEMA_VERSION,

        "case_id": charge.get("line_id"),

        "generated_at": generated_at,

        "status": outcome_status,

        "charge": {
            "line_id": charge.get("line_id"),
            "report_type": charge.get("report_type"),
            "charge_type": charge.get("charge_type"),
            "unit_id": charge.get("unit_id"),
            "org_id": charge.get("org_id"),
            "sku": charge.get("sku"),
            "fnsku": charge.get("fnsku"),
            "fba_shipment_id": charge.get("fba_shipment_id"),
            "order_id": charge.get("order_id"),
            "quantity": safe_int(
                charge.get("quantity")
            ),
            "amount_usd": amount,
            "posted_date": charge.get("posted_date"),
        },

        "decision": {
            "recovery_decision": decision,
            "claimable": claimable,
            "amount_usd": (
                amount
                if claimable
                else 0.0
            ),
            "reason": reason,
            "status": outcome_status,
            "decided_by": "deterministic_rule_engine",
            "decided_at": generated_at,
        },

        "outcome": outcome,

        "checks": checks,

        "evidence": all_evidence,

        "overrides": [],

        "trace": {
            "charge_to_unit": charge.get("unit_id"),
            "charge_to_org": charge.get("org_id"),

            "upstream_evidence": all_evidence,

            "evidence_interpretation": [
                {
                    "check_key": check.get("check_key"),
                    "verdict": check.get("verdict"),
                    "confidence": check.get("confidence"),
                    "detail": check.get("detail"),
                    "evidence_record_ids": [
                        ref.get("record_id")
                        for ref in check.get(
                            "evidence_refs", []
                        )
                        if ref.get("record_id")
                    ],
                }
                for check in checks
            ],

            "evaluated_evidence": all_evidence,

            "supporting_evidence": (
                supporting_evidence
                if decision == "SUPPORTED"
                else []
            ),

            "claim_decision": decision,
        },
    }

    case["content_hash"] = content_hash(case)

    return case


# ============================================================
# DATA LOADING
# ============================================================

def load_all_data():
    """Load the complete fixture dataset."""

    fees = load_csv(FEE_FILE)

    upstream = {}

    for source, path in UPSTREAM_FILES.items():
        upstream[source] = group_by_org_and_unit(
            load_csv(path)
        )

    return fees, upstream


# ============================================================
# METRICS
# ============================================================

def build_metrics(cases):
    """
    Build evaluation-style metrics from the generated cases.

    These are operational coverage metrics, not ground-truth
    accuracy metrics. Ground-truth precision requires an
    independently labelled evaluation set.
    """

    total_cases = len(cases)

    total_charged = sum(
        case["charge"]["amount_usd"]
        for case in cases
    )

    supported = [
        case
        for case in cases
        if case["decision"]["recovery_decision"]
        == "SUPPORTED"
    ]

    contradicted = [
        case
        for case in cases
        if case["decision"]["recovery_decision"]
        == "CONTRADICTED"
    ]

    uncertain = [
        case
        for case in cases
        if case["decision"]["recovery_decision"]
        == "UNCERTAIN"
    ]

    recommended_recovery = sum(
        case["decision"]["amount_usd"]
        for case in supported
    )

    review_amount = sum(
        case["charge"]["amount_usd"]
        for case in uncertain
    )

    decision_counts = {
        "SUPPORTED": len(supported),
        "CONTRADICTED": len(contradicted),
        "UNCERTAIN": len(uncertain),
    }

    by_charge_type = {}

    for case in cases:
        charge_type = case["charge"]["charge_type"]

        if charge_type not in by_charge_type:
            by_charge_type[charge_type] = {
                "charges": 0,
                "amount_usd": 0.0,
                "SUPPORTED": 0,
                "CONTRADICTED": 0,
                "UNCERTAIN": 0,
            }

        bucket = by_charge_type[charge_type]

        bucket["charges"] += 1
        bucket["amount_usd"] += case["charge"]["amount_usd"]

        decision = case["decision"]["recovery_decision"]

        if decision in bucket:
            bucket[decision] += 1

    uncertainty_rate = (
        len(uncertain) / total_cases
        if total_cases
        else 0.0
    )

    return {
        "total_cases": total_cases,

        "total_charged_usd": round(
            total_charged,
            2
        ),

        "recommended_recovery_usd": round(
            recommended_recovery,
            2
        ),

        "amount_pending_review_usd": round(
            review_amount,
            2
        ),

        "decision_counts": decision_counts,

        "uncertainty_rate": round(
            uncertainty_rate,
            4
        ),

        "by_charge_type": by_charge_type,

        "ground_truth_note": (
            "These metrics describe agent decisions on the supplied "
            "synthetic fixture. They are not accuracy or claim "
            "precision measurements because this dataset is not "
            "independently labelled ground truth."
        ),
    }


# ============================================================
# MAIN RUNNER
# ============================================================

def run():
    """Run the Recovery Manager over every charge."""

    print("=" * 70)
    print("RecoverIQ Recovery Manager")
    print("=" * 70)

    tenant_isolation_self_test()
    print("Tenant isolation test: PASS")

    fees, upstream = load_all_data()

    cases = []

    for charge in fees:
        org_id = clean_value(charge.get("org_id"))
        unit_id = clean_value(charge.get("unit_id"))

        evidence_key = (org_id, unit_id)

        evidence = {
            source: records.get(evidence_key, [])
            for source, records in upstream.items()
        }

        case = build_case(
            charge,
            evidence
        )

        cases.append(case)

    metrics = build_metrics(cases)

    result = {
        "agent": AGENT_NAME,
        "version": AGENT_VERSION,
        "schema_version": EVIDENCE_SCHEMA_VERSION,
        "generated_at": utc_now(),

        "policy": {
            "type": "deterministic_fixture_policy",
            "model_version": MODEL_VERSION,
            "conservative_uncertainty": True,
            "tenant_isolation": "org_id + unit_id",
            "human_overrides_supported": True,
            "description": (
                "Evidence-first recovery decisioning over synthetic "
                "upstream fixtures."
            ),
        },

        "input": {
            "fee_rows": len(fees),

            "unique_charge_units": len(
                {
                    (
                        clean_value(charge.get("org_id")),
                        clean_value(charge.get("unit_id")),
                    )
                    for charge in fees
                    if clean_value(charge.get("unit_id"))
                }
            ),

            "upstream_sources": list(
                UPSTREAM_FILES.keys()
            ),
        },

        "metrics": metrics,

        "cases": cases,
    }

    OUTPUT_FILE.write_text(
        json.dumps(
            result,
            indent=2
        ),
        encoding="utf-8"
    )

    # --------------------------------------------------------
    # Console summary
    # --------------------------------------------------------

    print()
    print(f"Agent version      : {AGENT_VERSION}")
    print(f"Charges processed  : {len(cases)}")
    print(f"Total charged      : ${metrics['total_charged_usd']:.2f}")
    print(
        "Recommended recovery: "
        f"${metrics['recommended_recovery_usd']:.2f}"
    )
    print(
        "Pending review     : "
        f"${metrics['amount_pending_review_usd']:.2f}"
    )
    print()

    print("DECISION SUMMARY")
    print("-" * 70)

    for decision in [
        "SUPPORTED",
        "CONTRADICTED",
        "UNCERTAIN",
    ]:
        print(
            f"{decision:15} : "
            f"{metrics['decision_counts'][decision]}"
        )

    print()

    print(
        "Uncertainty rate   : "
        f"{metrics['uncertainty_rate'] * 100:.2f}%"
    )

    print()
    print("CHARGE TYPE SUMMARY")
    print("-" * 70)

    for charge_type, data in sorted(
        metrics["by_charge_type"].items()
    ):
        print(
            f"{charge_type:35} "
            f"count={data['charges']:2} "
            f"amount=${data['amount_usd']:7.2f} "
            f"S={data['SUPPORTED']:2} "
            f"C={data['CONTRADICTED']:2} "
            f"U={data['UNCERTAIN']:2}"
        )

    print()
    print(f"Output file        : {OUTPUT_FILE}")
    print()
    print(
        "Recovery Case Files generated successfully."
    )


# ============================================================
# ENTRY POINT
# ============================================================

if __name__ == "__main__":
    run()