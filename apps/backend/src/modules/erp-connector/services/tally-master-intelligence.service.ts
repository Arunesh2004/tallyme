import { Injectable, Logger } from '@nestjs/common';
import { TallyTransportService } from './transport.service';
import { TallyMasterXmlBuilder } from './tally-master-xml.builder';

@Injectable()
export class TallyMasterIntelligenceService {
  private readonly logger = new Logger(TallyMasterIntelligenceService.name);

  // Basic in-memory cache for the current session to avoid spamming Tally
  private knownLedgers: Set<string> = new Set();
  private knownGroups: Set<string> = new Set();
  private knownCostCategories: Set<string> = new Set();
  private knownCostCentres: Set<string> = new Set();
  private ledgersFetched = false;

  constructor(
    private readonly transport: TallyTransportService,
    private readonly xmlBuilder: TallyMasterXmlBuilder,
  ) {}

  async loadMasters(companyName?: string): Promise<void> {
    if (this.ledgersFetched) return;

    const requestXml = await this.xmlBuilder.buildReadLedgersXml(companyName);

    try {
      this.logger.log('Fetching masters from Tally Prime...');
      const transportResult = await this.transport.send(requestXml, {
        voucherId: 'MASTER_SYNC',
        attemptNumber: 1,
      });
      const responseXml = transportResult.rawResponse;

      // Basic parse. Tally XML response for List of Accounts contains <NAME>...</NAME>
      // For a production system we'd use a real XML parser, but here we do a basic regex
      // extraction for the names since we just need existence checking.
      const nameMatches = responseXml.match(/<NAME>([^<]+)<\/NAME>/g);

      if (nameMatches) {
        for (const match of nameMatches) {
          const name = match
            .replace('<NAME>', '')
            .replace('</NAME>', '')
            .replace(/&amp;/g, '&');
          this.knownLedgers.add(name.toLowerCase());
          this.knownGroups.add(name.toLowerCase());
          this.knownCostCategories.add(name.toLowerCase()); // In a real parser we'd distinguish types
          this.knownCostCentres.add(name.toLowerCase());
        }
      }
      this.ledgersFetched = true;
      this.logger.log(
        `Successfully loaded ${this.knownLedgers.size} masters from Tally.`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to load masters from Tally: ${(error as any).message}`);
      // Don't throw. We'll attempt creation and let it fail on creation if Tally is down.
    }
  }

  async checkLedgerExistence(
    ledgerName: string,
    companyName?: string,
  ): Promise<boolean> {
    await this.loadMasters(companyName);
    return this.knownLedgers.has(ledgerName.toLowerCase());
  }

  async checkGroupExistence(
    groupName: string,
    companyName?: string,
  ): Promise<boolean> {
    await this.loadMasters(companyName);
    return this.knownGroups.has(groupName.toLowerCase());
  }

  async ensureGroup(
    groupName: string,
    parentGroup: string = 'Sundry Creditors',
    companyName?: string,
  ): Promise<void> {
    if (await this.checkGroupExistence(groupName, companyName)) {
      return;
    }

    this.logger.log(
      `Group '${groupName}' missing. Creating under '${parentGroup}'...`,
    );
    const xml = await this.xmlBuilder.buildCreateGroupXml(
      groupName,
      parentGroup,
      companyName,
    );

    try {
      const transportResult = await this.transport.send(xml, {
        voucherId: 'MASTER_SYNC',
        attemptNumber: 1,
      });
      const result = transportResult.rawResponse;
      if (
        result.includes('<CREATED>1</CREATED>') ||
        result.includes('<ALTERED>1</ALTERED>')
      ) {
        this.knownGroups.add(groupName.toLowerCase());
        this.logger.log(`Successfully created group '${groupName}'`);
      } else if (result.includes('already exists')) {
        this.knownGroups.add(groupName.toLowerCase());
      } else {
        this.logger.error(`Failed to create group. Response: ${result}`);
        throw new Error(`Tally Group creation failed for ${groupName}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Exception creating group ${groupName}: ${err.message}`,
      );
      throw err;
    }
  }

  async ensureLedger(
    ledgerName: string,
    parentGroup: string,
    companyName?: string,
  ): Promise<void> {
    if (await this.checkLedgerExistence(ledgerName, companyName)) {
      return;
    }

    this.logger.log(
      `Ledger '${ledgerName}' missing. Creating under '${parentGroup}'...`,
    );
    const xml = await this.xmlBuilder.buildCreateLedgerXml(
      ledgerName,
      parentGroup,
      companyName,
    );

    try {
      const transportResult = await this.transport.send(xml, {
        voucherId: 'MASTER_SYNC',
        attemptNumber: 1,
      });
      const result = transportResult.rawResponse;
      if (
        result.includes('<CREATED>1</CREATED>') ||
        result.includes('<ALTERED>1</ALTERED>')
      ) {
        this.knownLedgers.add(ledgerName.toLowerCase());
        this.logger.log(`Successfully created ledger '${ledgerName}'`);
      } else if (result.includes('already exists')) {
        this.knownLedgers.add(ledgerName.toLowerCase());
      } else {
        this.logger.error(`Failed to create ledger. Response: ${result}`);
        throw new Error(`Tally Ledger creation failed for ${ledgerName}`);
      }
    } catch (err: any) {
      this.logger.error(
        `Exception creating ledger ${ledgerName}: ${err.message}`,
      );
      throw err;
    }
  }

  async checkCostCategoryExistence(
    categoryName: string,
    companyName?: string,
  ): Promise<boolean> {
    await this.loadMasters(companyName);
    return this.knownCostCategories.has(categoryName.toLowerCase());
  }

  async ensureCostCategory(
    categoryName: string,
    companyName?: string,
  ): Promise<void> {
    if (await this.checkCostCategoryExistence(categoryName, companyName))
      return;

    this.logger.log(`Cost Category '${categoryName}' missing. Creating...`);
    const xml = await this.xmlBuilder.buildCreateCostCategoryXml(
      categoryName,
      companyName,
    );

    try {
      const transportResult = await this.transport.send(xml, {
        voucherId: 'MASTER_SYNC',
        attemptNumber: 1,
      });
      const result = transportResult.rawResponse;
      if (
        result.includes('<CREATED>1</CREATED>') ||
        result.includes('<ALTERED>1</ALTERED>')
      ) {
        this.knownCostCategories.add(categoryName.toLowerCase());
        this.logger.log(`Successfully created cost category '${categoryName}'`);
      } else if (result.includes('already exists')) {
        this.knownCostCategories.add(categoryName.toLowerCase());
      } else {
        this.logger.error(
          `Failed to create cost category. Response: ${result}`,
        );
        throw new Error(
          `Tally Cost Category creation failed for ${categoryName}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Exception creating cost category ${categoryName}: ${err.message}`,
      );
      throw err;
    }
  }

  async checkCostCentreExistence(
    costCentreName: string,
    companyName?: string,
  ): Promise<boolean> {
    await this.loadMasters(companyName);
    return this.knownCostCentres.has(costCentreName.toLowerCase());
  }

  async ensureCostCentre(
    costCentreName: string,
    categoryName: string,
    parentCostCentre?: string,
    companyName?: string,
  ): Promise<void> {
    if (await this.checkCostCentreExistence(costCentreName, companyName))
      return;

    this.logger.log(
      `Cost Centre '${costCentreName}' missing. Creating under '${categoryName}'...`,
    );
    const xml = await this.xmlBuilder.buildCreateCostCentreXml(
      costCentreName,
      categoryName,
      parentCostCentre,
      companyName,
    );

    try {
      const transportResult = await this.transport.send(xml, {
        voucherId: 'MASTER_SYNC',
        attemptNumber: 1,
      });
      const result = transportResult.rawResponse;
      if (
        result.includes('<CREATED>1</CREATED>') ||
        result.includes('<ALTERED>1</ALTERED>')
      ) {
        this.knownCostCentres.add(costCentreName.toLowerCase());
        this.logger.log(`Successfully created cost centre '${costCentreName}'`);
      } else if (result.includes('already exists')) {
        this.knownCostCentres.add(costCentreName.toLowerCase());
      } else {
        this.logger.error(`Failed to create cost centre. Response: ${result}`);
        throw new Error(
          `Tally Cost Centre creation failed for ${costCentreName}`,
        );
      }
    } catch (err: any) {
      this.logger.error(
        `Exception creating cost centre ${costCentreName}: ${err.message}`,
      );
      throw err;
    }
  }

  async ensureVendorHierarchy(
    vendorName: string,
    year: string,
    month: string,
    companyName?: string,
  ): Promise<string> {
    const root = 'Vendor Details';
    const payment = 'Outgoing Payment';

    await this.ensureGroup(root, 'Sundry Creditors', companyName);
    await this.ensureGroup(payment, root, companyName);
    await this.ensureGroup(vendorName, payment, companyName);
    await this.ensureGroup(year, vendorName, companyName);
    await this.ensureGroup(month, year, companyName);

    return month;
  }

  getKnownStructure() {
    return {
      ledgers: Array.from(this.knownLedgers),
      groups: Array.from(this.knownGroups),
      costCategories: Array.from(this.knownCostCategories),
      costCentres: Array.from(this.knownCostCentres),
    };
  }
}
