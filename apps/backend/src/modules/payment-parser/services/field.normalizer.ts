import { Injectable } from '@nestjs/common';

@Injectable()
export class FieldNormalizer {
  normalizeCurrency(currency: string | null | undefined): string | null {
    if (!currency) return null;
    const cur = currency.toUpperCase().trim();
    if (cur.includes('INR') || cur.includes('RS') || cur.includes('₹'))
      return 'INR';
    return cur;
  }

  normalizeAmount(amount: string | number | null | undefined): number | null {
    if (amount === undefined || amount === null) return null;
    if (typeof amount === 'number') return amount;
    const parsed = parseFloat(amount.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  normalizeString(val: string | null | undefined): string | null {
    if (!val) return null;
    return val.trim().replace(/\s+/g, ' ');
  }

  detectMissingFields(candidate: any): string[] {
    const requiredFields = [
      'admissionNumber',
      'amount',
      'utr',
      'feeMonth',
      'studentName',
      'transactionId',
    ];
    const missing: string[] = [];

    for (const field of requiredFields) {
      if (!candidate[field]) {
        missing.push(field);
      }
    }

    return missing;
  }
}
