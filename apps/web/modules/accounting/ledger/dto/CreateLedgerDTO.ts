export interface CreateLedgerDTO {
  name: string;
  parentGroup: string;
  openingBalance?: number;
  openingBalanceType?: 'Debit' | 'Credit';
  gstDetails?: {
    gstin?: string;
    registrationType?: string;
  };
  address?: string;
  email?: string;
  phone?: string;
  pan?: string;
  state?: string;
  country?: string;
  pincode?: string;
}
