import csv
from pathlib import Path
from collections import Counter


BASE_DIR = Path(__file__).resolve().parent

REVIEWER_A = BASE_DIR / "reviewer_a.csv"
REVIEWER_B = BASE_DIR / "reviewer_b.csv"
OUTPUT_FILE = BASE_DIR / "agreement_report.txt"


def load_labels(path):
    with path.open("r", encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))

    return {
        row["eval_case_id"]: row["human_label"]
        for row in rows
    }


def cohens_kappa(labels_a, labels_b):
    items = list(labels_a.keys())
    n = len(items)

    observed_agreement = sum(
        labels_a[item] == labels_b[item]
        for item in items
    ) / n

    categories = [
        "SUPPORTED",
        "CONTRADICTED",
        "UNCERTAIN",
    ]

    count_a = Counter(labels_a.values())
    count_b = Counter(labels_b.values())

    expected_agreement = sum(
        (count_a[label] / n) * (count_b[label] / n)
        for label in categories
    )

    if expected_agreement == 1:
        kappa = 1.0
    else:
        kappa = (
            observed_agreement - expected_agreement
        ) / (1 - expected_agreement)

    return observed_agreement, kappa


def main():
    labels_a = load_labels(REVIEWER_A)
    labels_b = load_labels(REVIEWER_B)

    common_cases = sorted(
        set(labels_a.keys()) & set(labels_b.keys())
    )

    labels_a = {
        case_id: labels_a[case_id]
        for case_id in common_cases
    }

    labels_b = {
        case_id: labels_b[case_id]
        for case_id in common_cases
    }

    observed_agreement, kappa = cohens_kappa(
        labels_a,
        labels_b,
    )

    disagreements = [
        case_id
        for case_id in common_cases
        if labels_a[case_id] != labels_b[case_id]
    ]

    count_a = Counter(labels_a.values())
    count_b = Counter(labels_b.values())

    report = f"""
RecoverIQ Reviewer Agreement Report
===================================

Evaluation cases: {len(common_cases)}

IMPORTANT:
These labels are synthetic reviewer simulations.
They are NOT independent human ground truth.

Reviewer A distribution:
SUPPORTED    : {count_a["SUPPORTED"]}
CONTRADICTED : {count_a["CONTRADICTED"]}
UNCERTAIN    : {count_a["UNCERTAIN"]}

Reviewer B distribution:
SUPPORTED    : {count_b["SUPPORTED"]}
CONTRADICTED : {count_b["CONTRADICTED"]}
UNCERTAIN    : {count_b["UNCERTAIN"]}

Observed agreement:
{observed_agreement:.4f}
{observed_agreement * 100:.2f}%

Cohen's kappa:
{kappa:.4f}

Disagreements:
{len(disagreements)}

Disagreement case IDs:
{", ".join(disagreements) if disagreements else "None"}

Interpretation:
The agreement statistics describe consistency between the
two synthetic reviewer simulations. They must not be presented
as human-review agreement or as independent ground truth.
"""

    OUTPUT_FILE.write_text(
        report.strip() + "\n",
        encoding="utf-8",
    )

    print("=" * 60)
    print("RecoverIQ Reviewer Agreement")
    print("=" * 60)
    print(f"Cases evaluated       : {len(common_cases)}")
    print(f"Observed agreement    : {observed_agreement:.4f}")
    print(f"Cohen's kappa         : {kappa:.4f}")
    print(f"Disagreements         : {len(disagreements)}")
    print()
    print("Synthetic labels only — NOT human ground truth.")
    print(f"Report: {OUTPUT_FILE}")
    print("=" * 60)


if __name__ == "__main__":
    main()