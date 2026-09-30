# RecoverIQ Unseen Evaluation Fixture

50 synthetic unseen cases for local evaluation. Units UNIT-0101 through UNIT-0150 are outside the development fixture UNIT-0001 through UNIT-0100.

These records follow the same CSV schemas as the sample fixture. They are synthetic and are not Amazon ground truth.

Do not feed `GROUND_TRUTH_PRIVATE.csv` to the agent. It is evaluator-only reference data for this constructed test set.

Cases cover all five supported charge types and multiple org_ids to exercise tenant-scoped matching.
