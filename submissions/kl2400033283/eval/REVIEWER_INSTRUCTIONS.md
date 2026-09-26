\# RecoverIQ Held-Out Evaluation — Reviewer Instructions



\## Purpose



This evaluation measures how well the RecoverIQ Recovery Manager handles 50 held-out cases that are separate from the 61-case development fixture.



The official evaluation protocol calls for the 50 unseen cases to be labeled independently by two human reviewers before evaluating the agent.



For this submission, the included Reviewer A and Reviewer B labels are synthetic reviewer labels generated to exercise and validate the evaluation pipeline. They are not independent human ground truth and must not be presented as human evaluation results.



\---



\## Allowed Labels



Use exactly one of these labels for every case:



\### SUPPORTED



Use `SUPPORTED` when the available evidence supports recovering the charge.



The evidence should provide a defensible basis for challenging or recovering the charge.



\### CONTRADICTED



Use `CONTRADICTED` when the available evidence supports the charge and therefore does not provide a defensible recovery basis.



\### UNCERTAIN



Use `UNCERTAIN` when the available evidence is insufficient, ambiguous, missing, or contradictory in a way that prevents a defensible recovery decision.



Do not force an uncertain case into `SUPPORTED` or `CONTRADICTED`.



\---



\## Important Decision Rule



Reviewers must judge the evidence, not the charged amount.



Do not infer missing facts from:



\- SKU name

\- product name

\- charge amount

\- quantity alone

\- assumptions about warehouse operations

\- assumptions about fee schedules

\- assumptions about Amazon policies



If authoritative evidence needed for the decision is missing, use `UNCERTAIN`.



\---



\## Reviewer Protocol



\### Official Evaluation Protocol



Reviewer A and Reviewer B should independently label all 50 cases from the evidence presented for each case.



Reviewer A must not see Reviewer B's labels before completing the review.



Reviewer B must not see Reviewer A's labels before completing the review.



Neither reviewer should use the agent's predicted decision while labeling.



\### Current Submission Status



The current repository contains programmatically generated synthetic labels for Reviewer A and Reviewer B because independent human labeling was not completed for this evaluation run.



These synthetic labels are included to make the evaluation pipeline reproducible and to demonstrate agreement and reference-comparison calculations.



They must not be interpreted as human-review agreement or independent human ground truth.



\---



\## Review Record Format



For every case, the evaluation records:



\- `eval\_case\_id`

\- `unit\_id`

\- `charge\_type`

\- `human\_label`

\- `reviewer\_id`

\- optional short rationale



The `reviewer\_id` values identify the labeling source.



For the current synthetic evaluation, the reviewer identifiers are:



\- `synthetic-reviewer-A`

\- `synthetic-reviewer-B`



Example:



```text

EVAL-001

UNIT-0101

inbound\_defect\_fee

SUPPORTED

synthetic-reviewer-A

Receiving evidence provides a defensible basis for recovery.

