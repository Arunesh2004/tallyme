import { create } from 'xmlbuilder2';
import { MasterType, TallyMasterNodeMap } from '../entities/MasterType';

export class MasterXmlBuilder {
  public static build(masterType: MasterType, entity: any, companyName: string = 'TallyMe Connect'): string {
    const nodeName = TallyMasterNodeMap[masterType];
    if (!nodeName) {
      throw new Error(`Unsupported master type for XML generation: ${masterType}`);
    }

    const root = create({ version: '1.0' })
      .ele('ENVELOPE')
        .ele('HEADER')
          .ele('TALLYREQUEST').txt('Import Data').up()
        .up()
        .ele('BODY')
          .ele('IMPORTDATA')
            .ele('REQUESTDESC')
              .ele('REPORTNAME').txt('All Masters').up()
              .ele('STATICVARIABLES')
                .ele('SVCURRENTCOMPANY').txt(companyName).up()
              .up()
            .up()
            .ele('REQUESTDATA')
              .ele('TALLYMESSAGE', { 'xmlns:UDF': 'TallyUDF' })
                .ele(nodeName, { NAME: entity.name, ACTION: 'Create' })
                  .ele('NAME').txt(entity.name).up();

    // Add common parent
    if (entity.parent) {
      root.ele('PARENT').txt(entity.parent).up();
    }

    // Type-specific logic
    switch (masterType) {
      case MasterType.LedgerGroup:
        if (entity.isSubLedger !== undefined) {
          root.ele('ISSUBLEDGER').txt(entity.isSubLedger ? 'Yes' : 'No').up();
        }
        if (entity.affectsGrossProfit !== undefined) {
          root.ele('AFFECTSGROSSPROFIT').txt(entity.affectsGrossProfit ? 'Yes' : 'No').up();
        }
        break;

      case MasterType.Unit:
        if (entity.formalName) {
          root.ele('FORMALNAME').txt(entity.formalName).up();
        }
        if (entity.decimalPlaces !== undefined) {
          root.ele('DECIMALPLACES').txt(entity.decimalPlaces.toString()).up();
        }
        break;

      case MasterType.Godown:
        if (entity.address) {
          root.ele('ADDRESS.LIST').ele('ADDRESS').txt(entity.address).up().up();
        }
        break;

      // StockGroup and CostCentre just need NAME and PARENT which are already handled
    }

    return root.end({ prettyPrint: false, headless: true });
  }
}
