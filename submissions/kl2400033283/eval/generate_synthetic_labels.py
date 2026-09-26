import csv
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

INPUT_FILE = BASE_DIR / "heldout_cases.csv"
REVIEWER_A = BASE_DIR / "reviewer_a.csv"
REVIEWER_B = BASE_DIR / "reviewer_b.csv"


def reviewer_a_label(row):
    pattern = row["evidence_pattern"]

    if pattern in {
        "defect_present",
        "shortage",
        "warehouse_damage_confirmed",
        "return_confirmed",
    }:
        return "CONTRADICTED"

    if pattern in {
        "no_defect",
        "fully_received",
    }:
        return "SUPPORTED"

    return "UNCERTAIN"


def reviewer_b_label(row):
    pattern = row["evidence_pattern"]

    # Synthetic second-reviewer simulation.
    # A small predefined disagreement set is included so that
    # inter-reviewer agreement can be measured without claiming
    # that these are real independent human labels.
    disagreements = {
        "EVAL-007",
        "EVAL-018",
        "EVAL-029",
        "EVAL-041",
    }

    if row["eval_case_id"] in disagreements:
        if pattern in {
            "defect_present",
            "shortage",
            "warehouse_damage_confirmed",
            "return_confirmed",
        }:
            return "UNCERTAIN"

        if pattern in {
            "no_defect",
            "fully_received",
        }:
            return "UNCERTAIN"

    return reviewer_a_label(row)


def write_labels(input_rows, output_file, label_function, reviewer_name):
    fieldnames = [
        "eval_case_id",
        "unit_id",
        "org_id",
        "charge_type",
        "amount_usd",
        "evidence_pattern",
        "human_label",
        "reviewer_id",
    ]

    with output_file.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for row in input_rows:
            writer.writerow({
                "eval_case_id": row["eval_case_id"],
                "unit_id": row["unit_id"],
                "org_id": row["org_id"],
                "charge_type": row["charge_type"],
                "amount_usd": row["amount_usd"],
                "evidence_pattern": row["evidence_pattern"],
                "human_label": label_function(row),
                "reviewer_id": reviewer_name,
            })


def main():
    with INPUT_FILE.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    write_labels(
        rows,
        REVIEWER_A,
        reviewer_a_label,
        "synthetic-reviewer-A",
    )

    write_labels(
        rows,
        REVIEWER_B,
        reviewer_b_label,
        "synthetic-reviewer-B",
    )

    print("=" * 60)
    print("RecoverIQ Synthetic Reviewer Evaluation")
    print("=" * 60)
    print(f"Cases processed : {len(rows)}")
    print(f"Reviewer A      : {REVIEWER_A}")
    print(f"Reviewer B      : {REVIEWER_B}")
    print()
    print("IMPORTANT:")
    print("These are synthetic reviewer labels.")
    print("They are NOT independent human ground truth.")
    print("=" * 60)


if __name__ == "__main__":
    main()