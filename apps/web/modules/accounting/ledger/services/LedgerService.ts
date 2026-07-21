import { CreateLedgerDTO } from '../dto/CreateLedgerDTO';
import { LedgerMapper } from '../mappers/LedgerMapper';
import { SchemaValidator } from '../validators/SchemaValidator';
import { BusinessValidator } from '../validators/BusinessValidator';
import { LedgerXmlBuilder } from '../builders/LedgerXmlBuilder';
import { PrismaLedgerRepository } from '../repositories/PrismaLedgerRepository';
import { LedgerResult } from '../types/LedgerResult';

export class LedgerService {
  constructor(private ledgerRepository: PrismaLedgerRepository) {}

  public async createLedger(dto: CreateLedgerDTO, companyName: string = 'Skyfall Legion Public School'): Promise<LedgerResult> {
    try {
      // 1. Schema Validation (throws ZodError if invalid)
      const validDto = SchemaValidator.validate(dto);

      // 2. Map to Domain Entity
      const entity = LedgerMapper.toEntity(validDto);

      // 3. Business Validation (throws Error if violates business rules)
      BusinessValidator.validate(entity);

      // 4. Save to Local Prisma DB and queue Outbox Event
      return await this.ledgerRepository.saveLedger(entity);

    } catch (error: any) {
      if (error.name === 'ZodError') {
        return {
          success: false,
          message: 'Schema validation failed',
          errors: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        };
      }

      return {
        success: false,
        message: error.message || 'An unexpected error occurred during ledger creation',
        errors: [error.message]
      };
    }
  }
}
