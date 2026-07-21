import { describe, it, expect } from 'vitest';
import { LedgerXmlBuilder } from '../../../../modules/accounting/ledger/builders/LedgerXmlBuilder';
import { Ledger } from '../../../../modules/accounting/ledger/entities/Ledger';

describe('LedgerXmlBuilder', () => {
  it('should generate exact Golden XML for a Ledger', () => {
    const ledger: Ledger = {
      name: 'ABC Corp',
      parentGroup: 'Sundry Debtors',
      openingBalance: 1500,
      openingBalanceType: 'Debit',
      address: '123 Tech Street',
      state: 'Karnataka',
      pan: 'ABCDE1234F',
      gstDetails: {
        registrationType: 'Regular',
        gstin: '29ABCDE1234F1Z5'
      }
    };

    const xml = LedgerXmlBuilder.build(ledger, 'TallyMe Connect');

    const expectedXml = '<ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME><STATICVARIABLES><SVCURRENTCOMPANY>TallyMe Connect</SVCURRENTCOMPANY></STATICVARIABLES></REQUESTDESC><REQUESTDATA><TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="ABC Corp" ACTION="Create"><NAME>ABC Corp</NAME><PARENT>Sundry Debtors</PARENT><OPENINGBALANCE>-1500</OPENINGBALANCE><ADDRESS.LIST><ADDRESS>123 Tech Street</ADDRESS></ADDRESS.LIST><LEDSTATE>Karnataka</LEDSTATE><INCOMETAXNUMBER>ABCDE1234F</INCOMETAXNUMBER><GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE><PARTYGSTIN>29ABCDE1234F1Z5</PARTYGSTIN></LEDGER></TALLYMESSAGE></REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>';
    
    expect(xml).toBe(expectedXml);
  });
});
