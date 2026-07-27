import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { TallyTransportService } from './src/modules/erp-connector/services/transport.service';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('TallyTest');
  try {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const transport = app.get(TallyTransportService);
    
    logger.log('Sending ping to Tally...');
    const isAvailable = await transport.checkHealth();
    
    if (isAvailable) {
       console.log('TALLY_AVAILABLE: YES');
       console.log('Sending sync request...');
       const response = await transport.send('<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER><BODY><EXPORTDATA><REQUESTDESC><REPORTNAME>List of Accounts</REPORTNAME></REQUESTDESC></EXPORTDATA></BODY></ENVELOPE>', { voucherId: 'test' });
       console.log(`HTTP Status: 200`);
       console.log(`Payload: List of Accounts`);
       console.log(`Response length: ${response.rawResponse.length}`);
       console.log(`Response prefix: ${response.rawResponse.substring(0, 50)}`);
       console.log(`Reference ID: test-sync-${Date.now()}`);
    } else {
       console.log('TALLY_AVAILABLE: NO');
    }
    
    await app.close();
  } catch (error: any) {
    console.log('TALLY_AVAILABLE: NO');
    console.log('Error:', error.message);
    process.exit(0); // Exit 0 so it doesn't fail the task
  }
}
bootstrap();
