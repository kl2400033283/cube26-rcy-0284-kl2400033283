# RecoverIQ — Recovery Manager Architecture

## 1. System Overview

RecoverIQ is an evidence-first Recovery Manager that evaluates charges against upstream operational evidence.

The system does not attempt to maximize the number of claims. Instead, it prioritizes defensible recovery decisions supported by traceable evidence.

Core flow:

```text
Fee / Reimbursement Charge
          |
          v
     Charge Parser
          |
          v
      Unit Matcher
          |
          v
   Evidence Retrieval
          |
          v
   Decision Engine
          |
     +----+----+
     |         |
     v         v
 SUPPORTED  CONTRADICTED
     |
     +----------------+
                      |
                      v
                 UNCERTAIN
                      |
                      v
                Human Review