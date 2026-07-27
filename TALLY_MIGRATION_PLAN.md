# Tally Migration Plan

## Architecture & Analysis Phase
To safely synchronize TallyMe's deep logic with an arbitrary Tally Prime installation, the Intelligence Layer performs a strict Discovery -> Diff -> Preview lifecycle.

## Diff Analysis Details
The controller `GET /tally/organization-preview` executes an analysis:
1. Gathers `currentStructure` utilizing the existing `TallyMasterIntelligenceService`.
2. Computes `requiredStructure` dynamically based on Vendor & Student metadata active within TallyMe's internal database schema.
3. Outputs an exact array of `missingGroups`, `missingCostCategories`, `missingCostCentres`, and `missingLedgers`.

## Safe Preview
All API outputs in the Preview Phase strictly remain READ-ONLY. No `TallyTransportService.send()` requests to mutate XML are dispatched until explicit user confirmation is passed into the `.organize()` flow.

## Simulated Output for E2E
During the `e2e` execution against the mock system, the preview yields the following required objects:
- **Missing Groups**: 'Vendor Details', 'Outgoing Payment', 'Student Details', 'Test Vendor', '2023', '07'
- **Missing Cost Categories**: 'Class', 'Section', 'Academic Year'
- **Missing Cost Centres**: '10', 'A', '2023-2024', 'John Doe'
- **Missing Ledgers**: 'Bank Account', 'Fee Collection', 'Discount'

*Estimated Objects to Create:* 16
*Identified Risks:* "Creating deep hierarchies without real Tally verification may lead to orphan ledgers."
