# RecoverIQ — Recovery Manager

RecoverIQ evaluates fee and reimbursement report rows against structured operational evidence from Receiving, Prep, Pack, and Returns. Every assessment is linked to the available records so reviewers can inspect the evidence before preparing a dispute.

## Run locally

```sh
npm install
npm run dev
```

Vite prints the local URL when the development server is ready. To create a production build, run `npm run build`.

## Use the workspace

- The dashboard starts with the included recovery cases and operational evidence.
- Select **Add report** to upload a fee/reimbursement CSV or JSON report. Evidence CSV/JSON files can be included in the same upload; identify their source in the filename with `receiving`, `prep`, `pack`, or `returns`.
- Search and filter cases by assessment, charge type, shipment, order, SKU, unit, or case ID.
- Open a case to inspect the assessment rationale, individual evidence checks, linked source records, and the underlying record fields.
- Export claim candidates as a JSON review package. Export does not submit a claim.

## Assessment policy

- **Claim candidate** (`SUPPORTED`): evidence supports disputing the charge; the charge amount is a potential claim amount, not a guaranteed recovery.
- **Charge supported** (`CONTRADICTED`): evidence supports the reported charge; no recovery claim is recommended.
- **Silent / uncertain** (`UNCERTAIN`): evidence is missing, ambiguous, or insufficient; no claim is recommended.
- Reimbursed charges explicitly identified in imported data are excluded from new claim packages.

The rule engine is deterministic and uses the records supplied to the workspace. Do not treat sample fixture metrics as independently verified accuracy or recovery outcomes.
