import { Ledger } from '../entities/Ledger';
import { CreateLedgerDTO } from '../dto/CreateLedgerDTO';

export class LedgerMapper {
  public static toEntity(dto: CreateLedgerDTO): Ledger {
    return {
      name: dto.name,
      parentGroup: dto.parentGroup,
      openingBalance: dto.openingBalance ?? 0,
      openingBalanceType: dto.openingBalanceType ?? 'Credit',
      gstDetails: dto.gstDetails,
      address: dto.address,
      email: dto.email,
      phone: dto.phone,
      pan: dto.pan,
      state: dto.state,
      country: dto.country,
      pincode: dto.pincode,
    };
  }
}
