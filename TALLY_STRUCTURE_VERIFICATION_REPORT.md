# Tally Structure Verification Report

## Vendor Hierarchy Verification
Required: Vendor Details -> Outgoing Payment -> Vendor Name -> Year -> Month

## Student Hierarchy Verification
Required: Student Details -> Class -> Section -> Academic Year -> Month -> Student Fee Entry

## Required Cost Allocations
For precise ledger distribution, the XML attributes `<CATEGORYALLOCATIONS.LIST>` and `<COSTCENTREALLOCATIONS.LIST>` must be structurally valid within Tally.

## Runtime Status
**TALLY_STRUCTURE_STATUS = UNVERIFIED**

Because the local `e2e` system is forced to run against an express-based Mock Tally Server rather than a live ODBC/TCP instance of Tally Prime:
1. We cannot query `CATEGORYALLOCATIONS.LIST` to see if Tally respects our deep hierarchical mappings.
2. We cannot verify if the XML successfully reflects deeply nested Vendor and Student hierarchies.

I have enforced the "Do not guess" rule and explicitly marked this capability as strictly unverified.
