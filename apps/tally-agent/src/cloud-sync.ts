import axios from 'axios';
import { TallyClient } from './tally-client';

export class CloudSync {
  constructor(
    private readonly cloudUrl: string,
    private readonly agentId: string,
    private readonly token: string,
    private readonly tallyClient: TallyClient
  ) {}

  startPolling(intervalMs: number) {
    setInterval(async () => {
      try {
        await this.pollForTasks();
      } catch (err: any) {
        console.error('[CloudSync] Polling error. Will retry.', err.message);
      }
    }, intervalMs);
  }

  private async pollForTasks() {
    const response = await axios.get(`${this.cloudUrl}/api/agent/sync-queue/pending`, {
      headers: { 'Authorization': `Bearer ${this.token}`, 'x-agent-id': this.agentId }
    });

    const tasks = response.data;
    if (!tasks || tasks.length === 0) return;

    for (const task of tasks) {
      console.log(`[CloudSync] Received Task: ${task.id} (${task.actionType})`);
      
      try {
        let result: any = null;
        
        switch (task.actionType) {
          case 'CREATE_LEDGER':
            result = await this.tallyClient.createLedger(task.payload);
            break;
          case 'CREATE_VOUCHER':
            result = await this.tallyClient.createVoucher(task.payload);
            break;
          case 'VERIFY_VOUCHER':
            result = await this.tallyClient.verifyVoucher(task.payload.voucherId);
            break;
          case 'EXECUTE_XML':
            result = await this.tallyClient.executeXml(task.payload.xml);
            break;
          default:
            throw new Error(`Unsupported actionType: ${task.actionType}`);
        }
        
        await axios.post(`${this.cloudUrl}/api/agent/sync-queue/${task.id}/result`, {
          syncId: task.id,
          actionType: task.actionType,
          status: result.success ? 'SUCCESS' : 'FAILED',
          response: result,
          error: result.error
        }, {
          headers: { 'Authorization': `Bearer ${this.token}`, 'x-agent-id': this.agentId }
        });
        
        console.log(`[CloudSync] Task ${task.id} execution reported back.`);
      } catch (err: any) {
         await axios.post(`${this.cloudUrl}/api/agent/sync-queue/${task.id}/result`, {
          syncId: task.id,
          actionType: task.actionType,
          status: 'FAILED',
          error: err.message
        }, {
          headers: { 'Authorization': `Bearer ${this.token}`, 'x-agent-id': this.agentId }
        });
      }
    }
  }
}
