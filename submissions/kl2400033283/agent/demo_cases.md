\# RecoverIQ — Demo Cases



\## CASE 1 — SUPPORTED RECOVERY



\*\*Charge:\*\* FEE-0014-1  

\*\*Charge Type:\*\* inbound\_defect\_fee  

\*\*Unit:\*\* UNIT-0014  

\*\*Amount:\*\* $2.00  



\### Evidence

\- Receiving record: RCV-0014

\- No recorded carton damage

\- No recorded unit damage

\- No recorded quality flag



\### Decision



\*\*Recovery Decision: SUPPORTED\*\*



\*\*Claimable: YES\*\*



\*\*Claim Amount: $2.00\*\*



\### Explanation



The available receiving evidence does not support the inbound defect charge. RecoverIQ therefore identifies a defensible recovery basis and marks the case as SUPPORTED.



\---



\## CASE 2 — CONTRADICTED RECOVERY



\*\*Charge:\*\* FEE-0003-1  

\*\*Charge Type:\*\* lost\_inbound  

\*\*Unit:\*\* UNIT-0003  



\### Evidence

\- Receiving record: RCV-0003

\- Quantity ordered: 48

\- Quantity received: 44

\- Shortage: 4 units



\### Decision



\*\*Recovery Decision: CONTRADICTED\*\*



\*\*Claimable: NO\*\*



\### Explanation



The receiving evidence shows a shortage of 4 units. This supports the lost-inbound charge rather than contradicting it. RecoverIQ therefore does not recommend a recovery claim.



\---



\## CASE 3 — UNCERTAIN / HUMAN REVIEW



\*\*Charge:\*\* FEE-0002-1  

\*\*Charge Type:\*\* fulfilment\_fee\_weight\_tier  

\*\*Unit:\*\* UNIT-0002  

\*\*Amount:\*\* $4.25  



\### Evidence Gap



The available evidence does not contain:



\- authoritative measured package weight

\- authoritative package dimensions

\- authoritative fee-tier schedule



\### Decision



\*\*Recovery Decision: UNCERTAIN\*\*



\*\*Claimable: NO\*\*



\*\*Review Required: YES\*\*



\### Explanation



RecoverIQ does not infer the correct fee tier from the SKU, quantity, or charged amount. Because the authoritative evidence required to evaluate the charge is missing, the case is routed for human review.

