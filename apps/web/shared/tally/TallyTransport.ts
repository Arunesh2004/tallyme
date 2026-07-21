import { TallyConfig } from './config/TallyConfig';
import { ConnectionError, TimeoutError, TallyUnavailableError } from './TallyError';
import { logger } from '../logging/logger';

export class TallyTransport {
  constructor(private config: TallyConfig) {}

  public async send(xmlPayload: string): Promise<string> {
    console.log('ENTER TallyTransport.send');
    const url = `http://${this.config.host}:${this.config.port}`;
    let attempt = 0;

    while (attempt < this.config.retryCount) {
      try {
        logger.debug({ url, attempt }, 'Sending request to Tally Prime');
        
        console.log('\n--- TALLY DEBUG: REQUEST ---');
        console.log(`URL: ${url}`);
        console.log('METHOD: POST');
        const headers = { 
          'Content-Type': 'text/xml',
          'Connection': this.config.keepAlive ? 'keep-alive' : 'close'
        };
        console.log('HEADERS:', headers);
        console.log('BODY:\n', xmlPayload);
        console.log('----------------------------\n');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        
        const startTime = Date.now();
        const response = await fetch(url, {
          method: 'POST',
          body: xmlPayload,
          headers,
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        console.log('\n--- TALLY DEBUG: RESPONSE ---');
        console.log(`STATUS CODE: ${response.status}`);
        const responseText = await response.text();
        console.log('BODY:\n', responseText);
        console.log('-----------------------------\n');

        if (!response.ok) {
          throw new ConnectionError(`HTTP Error: ${response.status}`);
        }
        
        logger.debug({ durationMs: Date.now() - startTime, url }, 'Tally Prime response received');
        return responseText;
      } catch (error: any) {
        attempt++;
        console.log('\n--- TALLY DEBUG: EXCEPTION ---');
        console.error('ERROR MESSAGE:', error.message);
        console.error('STACK TRACE:', error.stack);
        console.log('------------------------------\n');
        
        logger.warn({ error: error.message, attempt }, 'Tally request failed. Retrying...');
        
        if (error.name === 'AbortError') {
          if (attempt >= this.config.retryCount) throw new TimeoutError();
        } else if (error.cause?.code === 'ECONNREFUSED' || error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
          if (attempt >= this.config.retryCount) throw new TallyUnavailableError();
        }
        
        if (attempt >= this.config.retryCount) {
          throw new ConnectionError(error.message);
        }
        
        // Wait before retry
        await new Promise(res => setTimeout(res, this.config.retryDelay));
      }
    }
    
    throw new ConnectionError('Exhausted retry attempts.');
  }
}
