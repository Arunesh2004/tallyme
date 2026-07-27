# Live Tally Prime Setup Guide

## Host Requirements
- **OS**: Windows 10/11 or Windows Server (required for Tally Prime).
- **Tally Prime**: Valid Licensed Edition running in active Gateway state.

## Configuration Steps
1. **Enable HTTP Server**:
   - In Tally Prime, press `F1` (Help) > `Settings` > `Connectivity`.
   - Set **Enable HTTP/HTTPS for API Access** to **Yes**.
2. **Port Configuration**:
   - Set the default port to `9000` (or match the `TALLY_PORT` `.env` variable in TallyMe).
3. **Firewall Rules**:
   - Open Windows Defender Firewall.
   - Create a new Inbound Rule allowing TCP port `9000` to be reachable by the TallyMe backend server instance (if hosted on a separate network).
4. **Company Selection**:
   - Ensure the required Target Company is currently open in the Tally Gateway.
   - TallyMe acts against the actively opened Company.

## Pilot Verification Checklist
- [ ] Connection test (Ping `http://[tally-ip]:9000`)
- [ ] Company discovery (Execute `Operations -> Migration Center`)
- [ ] Ledger discovery
- [ ] Group discovery
- [ ] Cost category discovery
- [ ] Cost centre discovery
- [ ] Vendor structure verified
- [ ] Student structure verified
- [ ] Voucher creation test execution
- [ ] Voucher read-back verification
