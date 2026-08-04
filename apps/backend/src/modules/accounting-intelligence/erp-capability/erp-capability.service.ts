import { Injectable } from '@nestjs/common';
import { ErpCapabilityProfile } from '../../universal-transaction/domain/readiness.types';

@Injectable()
export class ErpCapabilityService {
  getProfile(erpType: string = 'TALLY'): ErpCapabilityProfile {
    // Currently hardcoded to Tally but designed for multi-ERP
    if (erpType === 'TALLY') {
      return {
        supportedVoucherTypes: ['PURCHASE', 'SALES', 'JOURNAL', 'RECEIPT', 'PAYMENT', 'CONTRA'],
        requiredFieldsPerVoucherType: {
          'PURCHASE': ['vendorId', 'expenseLedger'],
          'SALES': ['partyLedger', 'revenueLedger'],
          'JOURNAL': ['expenseLedger'],
          'RECEIPT': ['partyLedger', 'bankLedger'],
          'PAYMENT': ['partyLedger', 'bankLedger'],
          'CONTRA': ['bankLedger', 'cashLedger']
        },
        erpType: 'TALLY'
      };
    }
    
    return {
      supportedVoucherTypes: [],
      requiredFieldsPerVoucherType: {},
      erpType
    };
  }
}
