# Task list because GitHub Issues are disabled for this repository.

1. Gather failing and reference Tally voucher XML and place under test/fixtures/xml.
2. Add XML fixtures for tests (generated.xml, reference.xml).
3. Create a diff script to find missing/extra tags (focus on PARTS/LINES/BUTTONS).
4. Update XML builder to match Tally schema and order.
5. Normalize dates, numbers and ledger names for Tally.
6. Add XML shape validator (XPaths/JSON schema).
7. Add unit tests for XML builder that compare against reference fixtures.
8. Add optional integration test against local Tally instance.
9. Improve ERP connector logging to include full XML when Tally rejects it.
10. Add CI job to run XML shape checks on PRs and pushes.

(Notes: Attempted to create GitHub issues but Issues are disabled in this repository; tracking tasks here instead.)
