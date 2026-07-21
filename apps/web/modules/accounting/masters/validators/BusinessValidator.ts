import { CreateMasterDTO } from '../dto/CreateMasterDTO';
import { MasterType } from '../entities/MasterType';

export class BusinessValidator {
  public static validate(dto: CreateMasterDTO): void {
    if (dto.masterType === MasterType.LedgerGroup) {
      if (!dto.parent) {
        throw new Error("Ledger Groups usually require a primary parent group (like 'Primary', 'Current Assets', etc.) unless creating a Primary group explicitly.");
      }
    }

    if (dto.masterType === MasterType.Godown) {
      if (dto.name.toLowerCase() === 'main location') {
        throw new Error("'Main Location' is a reserved default Godown name in Tally.");
      }
    }
  }
}
