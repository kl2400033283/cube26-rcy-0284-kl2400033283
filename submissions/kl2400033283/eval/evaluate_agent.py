import csv
from pathlib import Path
from collections import Counter


BASE_DIR = Path(__file__).resolve().parent

CASES_FILE = BASE_DIR / "heldout_cases.csv"
REVIEWER_A_FILE = BASE_DIR / "reviewer_a.csv"
REVIEWER_B_FILE = BASE_DIR / "reviewer_b.csv"
OUTPUT_FILE = BASE_DIR / "agent_evaluation_report.txt"


def load_csv(path):
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def reviewer_reference(a, b):
    """
    Synthetic reference rule.

    Because the reviewer labels are synthetic, this does not claim
    human ground truth. The reference is simply the majority label
    between the two simulated reviewers.
    """
    if a == b:
        return a

    # In the one disagreement, use UNCERTAIN as the conservative
    # reference rather than selecting a recovery-positive label.
    return "UNCERTAIN"


def agent_decision(row):
    """
    Apply the same documented Recovery Manager decision semantics
    to the held-out evidence pattern.

    IMPORTANT:
    This is an evaluation harness, not a replacement for the main
    Recovery Manager.
    """

    charge_type = row["charge_type"]
    pattern = row["evidence_pattern"]

    # Recovery semantics:
    # evidence supporting the charge -> CONTRADICTED recovery
    # evidence contradicting the charge -> SUPPORTED recovery
    # insufficient evidence -> UNCERTAIN

    if charge_type == "inbound_defect_fee":
        if pattern == "defect_present":
            return "CONTRADICTED"
        if pattern == "no_defect":
            return "SUPPORTED"
        return "UNCERTAIN"

    if charge_type == "lost_inbound":
        if pattern == "shortage":
            return "CONTRADICTED"
        if pattern == "fully_received":
            return "SUPPORTED"
        return "UNCERTAIN"

    if charge_type == "damaged_in_warehouse":
        if pattern == "warehouse_damage_confirmed":
            return "CONTRADICTED"
        return "UNCERTAIN"

    if charge_type == "fulfilment_fee_weight_tier":
        # Authoritative weight/dimension/tier information is absent.
        return "UNCERTAIN"

    if charge_type == "refund_issued_item_not_returned":
        if pattern == "return_confirmed":
            return "SUPPORTED"
        return "UNCERTAIN"

    return "UNCERTAIN"


def confusion_matrix(results):
    labels = [
        "SUPPORTED",
        "CONTRADICTED",
        "UNCERTAIN",
    ]

    matrix = {
        actual: {predicted: 0 for predicted in labels}
        for actual in labels
    }

    for row in results:
        matrix[row["reference"]][row["agent"]] += 1

    return matrix


def main():
    cases = load_csv(CASES_FILE)
    reviewer_a = {
        row["eval_case_id"]: row["human_label"]
        for row in load_csv(REVIEWER_A_FILE)
    }
    reviewer_b = {
        row["eval_case_id"]: row["human_label"]
        for row in load_csv(REVIEWER_B_FILE)
    }

    results = []

    for case in cases:
        case_id = case["eval_case_id"]

        label_a = reviewer_a[case_id]
        label_b = reviewer_b[case_id]

        reference = reviewer_reference(
            label_a,
            label_b,
        )

        agent = agent_decision(case)

        results.append({
            "eval_case_id": case_id,
            "charge_type": case["charge_type"],
            "reference": reference,
            "agent": agent,
            "reviewer_a": label_a,
            "reviewer_b": label_b,
        })

    total = len(results)

    correct = sum(
        row["reference"] == row["agent"]
        for row in results
    )

    agreement = correct / total if total else 0.0

    matrix = confusion_matrix(results)

    reference_counts = Counter(
        row["reference"]
        for row in results
    )

    agent_counts = Counter(
        row["agent"]
        for row in results
    )

    report_lines = [
        "RecoverIQ Held-Out Evaluation Report",
        "====================================",
        "",
        f"Cases evaluated: {total}",
        "",
        "IMPORTANT LIMITATION",
        "--------------------",
        "Reviewer labels are synthetic simulations.",
        "They are NOT independent human ground truth.",
        "Therefore the results below are protocol measurements,",
        "not claims of validated real-world accuracy.",
        "",
        "Agent vs synthetic reference",
        "-----------------------------",
        f"Agreement: {correct}/{total} = {agreement:.4f}",
        f"Agreement percentage: {agreement * 100:.2f}%",
        "",
        "Reference distribution",
        "----------------------",
        f"SUPPORTED: {reference_counts['SUPPORTED']}",
        f"CONTRADICTED: {reference_counts['CONTRADICTED']}",
        f"UNCERTAIN: {reference_counts['UNCERTAIN']}",
        "",
        "Agent distribution",
        "------------------",
        f"SUPPORTED: {agent_counts['SUPPORTED']}",
        f"CONTRADICTED: {agent_counts['CONTRADICTED']}",
        f"UNCERTAIN: {agent_counts['UNCERTAIN']}",
        "",
        "Confusion matrix",
        "----------------",
        "Rows = synthetic reference",
        "Columns = agent decision",
        "",
        "                     Agent",
        "Reference       SUPPORTED  CONTRADICTED  UNCERTAIN",
        (
            "SUPPORTED       "
            f"{matrix['SUPPORTED']['SUPPORTED']:>9}  "
            f"{matrix['SUPPORTED']['CONTRADICTED']:>11}  "
            f"{matrix['SUPPORTED']['UNCERTAIN']:>9}"
        ),
        (
            "CONTRADICTED    "
            f"{matrix['CONTRADICTED']['SUPPORTED']:>9}  "
            f"{matrix['CONTRADICTED']['CONTRADICTED']:>11}  "
            f"{matrix['CONTRADICTED']['UNCERTAIN']:>9}"
        ),
        (
            "UNCERTAIN       "
            f"{matrix['UNCERTAIN']['SUPPORTED']:>9}  "
            f"{matrix['UNCERTAIN']['CONTRADICTED']:>11}  "
            f"{matrix['UNCERTAIN']['UNCERTAIN']:>9}"
        ),
        "",
        "Per-case results",
        "----------------",
    ]

    for row in results:
        report_lines.append(
            f"{row['eval_case_id']} | "
            f"{row['charge_type']} | "
            f"reference={row['reference']} | "
            f"agent={row['agent']} | "
            f"A={row['reviewer_a']} | "
            f"B={row['reviewer_b']}"
        )

    OUTPUT_FILE.write_text(
        "\n".join(report_lines) + "\n",
        encoding="utf-8",
    )

    print("=" * 60)
    print("RecoverIQ Held-Out Evaluation")
    print("=" * 60)
    print(f"Cases evaluated    : {total}")
    print(f"Agent/reference    : {correct}/{total}")
    print(f"Agreement          : {agreement * 100:.2f}%")
    print()
    print("Synthetic reference only.")
    print("NOT independent human ground truth.")
    print()
    print(f"Report: {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()