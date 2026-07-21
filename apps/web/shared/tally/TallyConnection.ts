import { TallyTransport } from './TallyTransport';
import { XmlBuilder } from './XmlBuilder';
import { XmlParser } from './XmlParser';
import { logger } from '../logging/logger';
import { TallyUnavailableError } from './TallyError';

export class TallyConnection {
  constructor(private transport: TallyTransport) {}

  public async ping(): Promise<boolean> {
    console.log('ENTER TallyConnection.ping');
    try {
      const xml = `<ENVELOPE>
      <HEADER>
        <VERSION>1</VERSION>
        <TALLYREQUEST>Export</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>List of Companies</ID>
      </HEADER>
      <BODY>
        <DESC>
          <STATICVARIABLES>
            <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          </STATICVARIABLES>
          <TDL>
            <TDLMESSAGE>
              <COLLECTION NAME="List of Companies" ISINITIALIZE="Yes">
                <TYPE>Company</TYPE>
                <NATIVEMETHOD>Name</NATIVEMETHOD>
              </COLLECTION>
            </TDLMESSAGE>
          </TDL>
        </DESC>
      </BODY>
    </ENVELOPE>`;
      const rawResponse = await this.transport.send(xml);
      XmlParser.parseResponse(rawResponse);
      return true;
    } catch (error) {
      console.error("PING EXCEPTION:", error);
      return false;
    }
  }

  public async testConnection(): Promise<{ success: boolean; message: string }> {
    const isAlive = await this.ping();
    if (isAlive) {
      return { success: true, message: 'Successfully connected to Tally Prime.' };
    }
    return { success: false, message: 'Could not connect to Tally Prime. Check host, port, and company status.' };
  }

  public async health(): Promise<string> {
    console.log('ENTER TallyConnection.health');
    return (await this.ping()) ? 'HEALTHY' : 'UNREACHABLE';
  }

  // Abstract methods per requirements
  public async connect(): Promise<void> {
    // Tally HTTP is stateless, but this could reserve connection slots or validate company state
    if (!(await this.ping())) {
      throw new TallyUnavailableError('Cannot establish logical connection to Tally Prime.');
    }
  }

  public async disconnect(): Promise<void> {
    // Release any holds
    logger.debug('Logical Tally connection terminated.');
  }
}
