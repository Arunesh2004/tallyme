# Project Guidelines

This project has a strict architectural constitution. Review PRODUCT_CONSTITUTION.md in the repository root.

**Core Principles:**
1. There are EXACTLY TWO mandatory business features: Vendor Slip Automation and Student Fee Automation.
2. Both workflows MUST converge into the Shared Accounting Engine.
3. No accounting logic, voucher generation, ERP communication, or retry logic may ever be duplicated. All accounting flows through the Shared Accounting Engine.
4. Future enhancements must preserve and integrate with these canonical workflows, never bypassing them.

Always verify your changes against the PRODUCT_CONSTITUTION.md rules before implementing anything.
