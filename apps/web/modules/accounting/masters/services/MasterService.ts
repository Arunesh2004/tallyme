import { CreateMasterDTO } from '../dto/CreateMasterDTO';
import { MasterMapper } from '../mappers/MasterMapper';
import { SchemaValidator } from '../validators/SchemaValidator';
import { BusinessValidator } from '../validators/BusinessValidator';
import { MasterXmlBuilder } from '../builders/MasterXmlBuilder';
import { PrismaMasterRepository } from '../repositories/PrismaMasterRepository';
import { MasterResult } from '../types/MasterResult';
import { MasterType } from '../entities/MasterType';

export class MasterService {
  constructor(private masterRepository: PrismaMasterRepository) {}

  public async createMaster(dto: CreateMasterDTO, companyName: string = 'Skyfall Legion Public School'): Promise<MasterResult> {
    try {
      // 1. Schema Validation (throws ZodError if invalid)
      const validDto = SchemaValidator.validate(dto) as CreateMasterDTO;

      // 2. Business Validation (throws Error if violates business rules)
      BusinessValidator.validate(validDto);

      // 3. Map to Domain Entity
      const entity = MasterMapper.toEntity(validDto);

      // 4. Save to Local Prisma DB and queue Outbox Event
      return await this.masterRepository.saveMaster(validDto.masterType, entity);

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
        message: error.message || 'An unexpected error occurred during master creation',
        errors: [error.message]
      };
    }
  }

  public async readMasters(masterType: MasterType): Promise<MasterResult> {
    return this.masterRepository.readMasters(masterType);
  }
}
