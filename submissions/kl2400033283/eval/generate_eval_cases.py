import csv
import random
from pathlib import Path


OUTPUT_DIR = Path(__file__).resolve().parent
OUTPUT_FILE = OUTPUT_DIR / "heldout_cases.csv"

CHARGE_TYPES = [
    "inbound_defect_fee",
    "lost_inbound",
    "damaged_in_warehouse",
    "fulfilment_fee_weight_tier",
    "refund_issued_item_not_returned",
]

random.seed(260928)


def make_case(index):
    unit_number = 101 + index
    unit_id = f"UNIT-{unit_number:04d}"

    charge_type = CHARGE_TYPES[index % len(CHARGE_TYPES)]

    amount_map = {
        "inbound_defect_fee": [1.00, 1.50, 2.00],
        "lost_inbound": [0.00],
        "damaged_in_warehouse": [10.00, 12.00, 14.00],
        "fulfilment_fee_weight_tier": [3.50, 4.25, 5.10, 6.35],
        "refund_issued_item_not_returned": [0.00],
    }

    amount = random.choice(amount_map[charge_type])

    if charge_type == "inbound_defect_fee":
        evidence_pattern = random.choice([
            "defect_present",
            "no_defect",
            "insufficient_evidence",
        ])

    elif charge_type == "lost_inbound":
        evidence_pattern = random.choice([
            "shortage",
            "fully_received",
        ])

    elif charge_type == "damaged_in_warehouse":
        evidence_pattern = random.choice([
            "warehouse_damage_confirmed",
            "clean_upstream_evidence",
            "insufficient_attribution",
        ])

    elif charge_type == "fulfilment_fee_weight_tier":
        evidence_pattern = "missing_authoritative_weight_data"

    else:
        evidence_pattern = random.choice([
            "return_confirmed",
            "return_missing",
        ])

    return {
        "eval_case_id": f"EVAL-{index + 1:03d}",
        "unit_id": unit_id,
        "org_id": "org_eval_heldout",
        "charge_type": charge_type,
        "amount_usd": f"{amount:.2f}",
        "evidence_pattern": evidence_pattern,
        "human_label_a": "",
        "human_label_b": "",
    }


def main():
    cases = [make_case(i) for i in range(50)]

    fieldnames = [
        "eval_case_id",
        "unit_id",
        "org_id",
        "charge_type",
        "amount_usd",
        "evidence_pattern",
        "human_label_a",
        "human_label_b",
    ]

    with OUTPUT_FILE.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(cases)

    print("=" * 60)
    print("RecoverIQ Held-Out Evaluation Dataset")
    print("=" * 60)
    print(f"Cases generated : {len(cases)}")
    print(f"Unit range      : UNIT-0101 to UNIT-0150")
    print(f"Output file     : {OUTPUT_FILE}")
    print()
    print("Human labels are intentionally blank.")
    print("They must be assigned independently by two reviewers.")
    print("=" * 60)


if __name__ == "__main__":
    main()