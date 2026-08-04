import { Injectable } from '@nestjs/common';
import { VmmsAdminRepository } from '../infrastructure/repositories/vmms-admin.repository';
import { ResolveMismatchDto, CreateAliasDto } from '../api/dto/vmms-admin.dto';

@Injectable()
export class VmmsAdminService {
  constructor(private readonly adminRepo: VmmsAdminRepository) {}

  public async resolveMismatch(
    dto: ResolveMismatchDto,
    userId: string,
  ): Promise<void> {
    await this.adminRepo.resolveMismatch(
      dto.invoiceId,
      dto.verdict,
      dto.notes,
      dto.proposedAlias,
      userId,
    );
  }

  public async createAlias(dto: CreateAliasDto, userId: string): Promise<any> {
    return await this.adminRepo.createAlias(
      dto.vendorLedgerId,
      dto.aliasText,
      dto.invoiceIdContext,
      userId,
    );
  }
}
