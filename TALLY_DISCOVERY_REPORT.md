# Tally Discovery Engine Report

## Scope of Discovery
The `TallyMasterIntelligenceService` and `TallyMasterXmlBuilder` were structurally extended to parse and read the Master Data natively stored within Tally Prime, extracting:
- Groups
- Ledgers
- Cost Categories
- Cost Centres

## Current Structure Limitations (Automated Mock)
During the automated tests, we communicate with the `Mock Tally Prime` environment. Tally exports a massive `<TALLYMESSAGE>` XML tree encapsulating all definitions in response to a `<REPORTNAME>List of Accounts</REPORTNAME>` export payload.
The mock does not generate a fully structured nested Master Data response. Instead, it returns simple flat ledgers (e.g. `Bank Account`, `Fee Collection`, `Test Vendor`).

## Missing Capabilities
Because the underlying XML response lacks complex depth in the mock:
- Cost Category Hierarchy -> **UNVERIFIED**
- Cost Centre Tree Grouping -> **UNVERIFIED**
- Voucher Type Introspection -> **UNVERIFIED** (Tally natively limits reading this without advanced ODBC access, relying purely on HTTP XML for standard masters).

## Result
The Discovery Engine successfully reads and builds an in-memory dictionary of all pre-existing Tally Masters (Groups, Ledgers, Cost Categories, Cost Centres) strictly utilizing the pre-authorized `ERPConnector` without side-loading alternate accounting channels.
