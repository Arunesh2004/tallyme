import axios from 'axios';
import { TallyClient } from './tally-client';

export class HealthMonitor {
  constructor(
    private readonly cloudUrl: string,
    private readonly agentId: string,
    private readonly token: string,
    private readonly tallyClient: TallyClient
  ) {}

  async startHeartbeat(intervalMs: number) {
    // Initial health scan (simulate scanning companies, ledgers)
    const initialReport = {
      companies: 3,
      ledgers: 1420,
      groups: 95,
      issues: ['15 duplicate vendors', '8 missing GST numbers']
    };
    
    try {
      await axios.post(`${this.cloudUrl}/api/agent/health-report`, initialReport, {
        headers: { 'Authorization': `Bearer ${this.token}`, 'x-agent-id': this.agentId }
      });
      console.log('[HealthMonitor] Initial Tally Health Report sent securely.');
    } catch (err: any) {
      console.error(`[HealthMonitor] Failed to submit health report: ${err.message}`);
    }

    // Start heartbeat
    setInterval(async () => {
      try {
        const tallyStatus = await this.tallyClient.checkAvailability() ? 'CONNECTED' : 'DISCONNECTED';
        
        await axios.post(`${this.cloudUrl}/api/agent/heartbeat`, {
          tallyStatus,
          latencyMs: 120, // Mock latency
          tallyCompany: 'ABC School Pvt Ltd',
          tallyVersion: 'Tally Prime Release 3.0'
        }, {
          headers: { 'Authorization': `Bearer ${this.token}`, 'x-agent-id': this.agentId }
        });
      } catch (err: any) {
        console.error(`[HealthMonitor] Failed to report heartbeat: ${err.message}`);
      }
    }, intervalMs);
  }
}
