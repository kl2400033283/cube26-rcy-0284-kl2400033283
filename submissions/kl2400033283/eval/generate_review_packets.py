import csv
import json
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
CASES_FILE = BASE_DIR / "heldout_cases.csv"
OUTPUT_FILE = BASE_DIR / "review_packets.json"


def receiving_evidence(unit_id, pattern):
    if pattern == "defect_present":
        return {
            "source": "receiving",
            "record_id": f"RCV-{unit_id}",
            "unit_id": unit_id,
            "org_id": "org_eval_heldout",
            "qty_ordered": 48,
            "qty_received": 48,
            "identity_match": "yes",
            "carton_damage": "no",
            "unit_damage": "yes",
            "quality_flags": "obvious_defect",
            "photo_refs": [f"photo://{unit_id}/receiving-1"],
        }

    if pattern == "no_defect":
        return {
            "source": "receiving",
            "record_id": f"RCV-{unit_id}",
            "unit_id": unit_id,
            "org_id": "org_eval_heldout",
            "qty_ordered": 48,
            "qty_received": 48,
            "identity_match": "yes",
            "carton_damage": "no",
            "unit_damage": "no",
            "quality_flags": "",
            "photo_refs": [f"photo://{unit_id}/receiving-1"],
        }

    return {
        "source": "receiving",
        "record_id": f"RCV-{unit_id}",
        "unit_id": unit_id,
        "org_id": "org_eval_heldout",
        "qty_ordered": 48,
        "qty_received": 48,
        "identity_match": "yes",
        "carton_damage": "unknown",
        "unit_damage": "unknown",
        "quality_flags": "",
        "photo_refs": [],
    }


def lost_inbound_evidence(unit_id, pattern):
    if pattern == "shortage":
        return {
            "source": "receiving",
            "record_id": f"RCV-{unit_id}",
            "unit_id": unit_id,
            "org_id": "org_eval_heldout",
            "qty_ordered": 48,
            "qty_received": 44,
            "identity_match": "yes",
            "carton_damage": "no",
            "unit_damage": "no",
            "quality_flags": "",
            "photo_refs": [f"photo://{unit_id}/receiving-1"],
        }

    return {
        "source": "receiving",
        "record_id": f"RCV-{unit_id}",
        "unit_id": unit_id,
        "org_id": "org_eval_heldout",
        "qty_ordered": 48,
        "qty_received": 48,
        "identity_match": "yes",
        "carton_damage": "no",
        "unit_damage": "no",
        "quality_flags": "",
        "photo_refs": [f"photo://{unit_id}/receiving-1"],
    }


def warehouse_damage_evidence(unit_id, pattern):
    if pattern == "warehouse_damage_confirmed":
        return {
            "source": "pack",
            "record_id": f"PK-{unit_id}",
            "unit_id": unit_id,
            "org_id": "org_eval_heldout",
            "operator_verdict": "damaged_in_warehouse",
            "observed_in_box": "damaged",
            "photo_refs": [f"photo://{unit_id}/pack-damage-1"],
        }

    if pattern == "clean_upstream_evidence":
        return {
            "source": "receiving",
            "record_id": f"RCV-{unit_id}",
            "unit_id": unit_id,
            "org_id": "org_eval_heldout",
            "qty_ordered": 48,
            "qty_received": 48,
            "carton_damage": "no",
            "unit_damage": "no",
            "quality_flags": "",
            "photo_refs": [f"photo://{unit_id}/receiving-1"],
        }

    return {
        "source": "receiving",
        "record_id": f"RCV-{unit_id}",
        "unit_id": unit_id,
        "org_id": "org_eval_heldout",
        "qty_ordered": 48,
        "qty_received": 48,
        "carton_damage": "no",
        "unit_damage": "no",
        "quality_flags": "",
        "photo_refs": [],
    }


def weight_tier_evidence(unit_id):
    return {
        "source": "receiving",
        "record_id": f"RCV-{unit_id}",
        "unit_id": unit_id,
        "org_id": "org_eval_heldout",
        "sku": f"SKU-EVAL-{unit_id[-4:]}",
        "product_title": "Synthetic evaluation product",
        "qty_ordered": 1,
        "qty_received": 1,
        "photo_refs": [f"photo://{unit_id}/receiving-1"],
        "authoritative_weight_kg": None,
        "authoritative_dimensions_cm": None,
        "authoritative_fee_tier_schedule": None,
    }


def return_evidence(unit_id, pattern):
    if pattern == "return_confirmed":
        return {
            "source": "returns",
            "record_id": f"RTN-{unit_id}",
            "unit_id": unit_id,
            "org_id": "org_eval_heldout",
            "order_id": f"ORDER-{unit_id}",
            "identity_match": "yes",
            "parts_list": "complete",
            "parts_missing": "",
            "observed_state": "factory_sealed",
            "amazon_condition": "sellable",
            "operator_disposition": "restock",
            "photo_refs": [f"photo://{unit_id}/return-1"],
        }

    return {
        "source": "returns",
        "record_id": f"RTN-{unit_id}",
        "unit_id": unit_id,
        "org_id": "org_eval_heldout",
        "order_id": f"ORDER-{unit_id}",
        "identity_match": "unknown",
        "parts_list": "",
        "parts_missing": "",
        "observed_state": "",
        "amazon_condition": "",
        "operator_disposition": "",
        "photo_refs": [],
    }


def build_packet(case):
    unit_id = case["unit_id"]
    charge_type = case["charge_type"]
    pattern = case["evidence_pattern"]

    evidence = []

    if charge_type == "inbound_defect_fee":
        evidence.append(receiving_evidence(unit_id, pattern))

    elif charge_type == "lost_inbound":
        evidence.append(lost_inbound_evidence(unit_id, pattern))

    elif charge_type == "damaged_in_warehouse":
        evidence.append(warehouse_damage_evidence(unit_id, pattern))

    elif charge_type == "fulfilment_fee_weight_tier":
        evidence.append(weight_tier_evidence(unit_id))

    elif charge_type == "refund_issued_item_not_returned":
        evidence.append(return_evidence(unit_id, pattern))

    return {
        "eval_case_id": case["eval_case_id"],
        "unit_id": unit_id,
        "org_id": case["org_id"],
        "charge": {
            "charge_type": charge_type,
            "amount_usd": float(case["amount_usd"]),
        },
        "evidence": evidence,
        "review_instruction": (
            "Determine whether the available evidence supports recovery, "
            "contradicts recovery, or is insufficient for a defensible decision. "
            "Do not infer missing authoritative evidence."
        ),
        "human_label_a": "",
        "human_label_b": "",
    }


def main():
    with CASES_FILE.open("r", encoding="utf-8", newline="") as f:
        cases = list(csv.DictReader(f))

    packets = [build_packet(case) for case in cases]

    with OUTPUT_FILE.open("w", encoding="utf-8") as f:
        json.dump(packets, f, indent=2)

    print("=" * 60)
    print("RecoverIQ Held-Out Review Packets")
    print("=" * 60)
    print(f"Packets generated : {len(packets)}")
    print(f"Output file       : {OUTPUT_FILE}")
    print()
    print("No human labels were generated.")
    print("Reviewers must label independently.")
    print("=" * 60)


if __name__ == "__main__":
    main()