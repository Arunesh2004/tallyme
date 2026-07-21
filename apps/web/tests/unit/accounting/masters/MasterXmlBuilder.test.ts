import { describe, it, expect } from 'vitest';
import { MasterXmlBuilder } from '../../../../modules/accounting/masters/builders/MasterXmlBuilder';
import { MasterType } from '../../../../modules/accounting/masters/entities/MasterType';

describe('MasterXmlBuilder', () => {
  it('should generate exact Golden XML for a Godown', () => {
    const godown = {
      name: 'Warehouse A',
      parent: 'Primary',
      address: 'Sector 5, NY'
    };

    const xml = MasterXmlBuilder.build(MasterType.Godown, godown, 'TallyMe Connect');

    const expectedXml = '<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>TallyMe Connect</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><GODOWN NAME="Warehouse A" ACTION="Create"><NAME>Warehouse A</NAME><PARENT>Primary</PARENT><ADDRESS.LIST><ADDRESS>Sector 5, NY</ADDRESS></ADDRESS.LIST></GODOWN></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>';
    
    expect(xml).toBe(expectedXml);
  });

  it('should generate exact Golden XML for a Unit', () => {
    const unit = {
      name: 'NOS',
      formalName: 'Numbers',
      decimalPlaces: 0
    };

    const xml = MasterXmlBuilder.build(MasterType.Unit, unit, 'TallyMe Connect');

    const expectedXml = '<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>TallyMe Connect</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><UNIT NAME="NOS" ACTION="Create"><NAME>NOS</NAME><FORMALNAME>Numbers</FORMALNAME><DECIMALPLACES>0</DECIMALPLACES></UNIT></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>';
    
    expect(xml).toBe(expectedXml);
  });
});
