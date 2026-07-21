import { CreateVoucherDTO } from '../dto/CreateVoucherDTO';
import { VoucherMapper } from '../mappers/VoucherMapper';
import { SchemaValidator } from '../validators/SchemaValidator';
import { BusinessValidator } from '../validators/BusinessValidator';
import { VoucherXmlBuilder } from '../builders/VoucherXmlBuilder';
import { PrismaVoucherRepository } from '../repositories/PrismaVoucherRepository';
import { VoucherResult } from '../types/VoucherResult';

export class VoucherService {
  constructor(private voucherRepository: PrismaVoucherRepository) {}

  public async createVoucher(dto: CreateVoucherDTO, companyName: string = 'Skyfall Legion Public School'): Promise<VoucherResult> {
    try {
      // 1. Schema Validation (throws ZodError if invalid)
      const validDto = SchemaValidator.validate(dto);

      // 2. Map to Domain Entity
      const entity = VoucherMapper.toEntity(validDto);

      // 3. Business Validation (throws Error if unbalanced or violates accounting rules)
      BusinessValidator.validate(entity);

      // 4. Save to Local Prisma DB and queue Outbox Event
      return await this.voucherRepository.saveVoucher(entity);

    } catch (error: any) {
      // Catch validation errors and return a failed result
      if (error.name === 'ZodError') {
        return {
          success: false,
          message: 'Schema validation failed',
          errors: error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`)
        };
      }

      return {
        success: false,
        message: error.message || 'An unexpected error occurred during voucher creation',
        errors: [error.message]
      };
    }
  }
}
