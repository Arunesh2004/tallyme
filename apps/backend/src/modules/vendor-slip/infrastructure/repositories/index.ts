import { Injectable } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../../../infrastructure/prisma';
import { 
  IVendorRepository, IInvoiceCandidateRepository,
  VendorQuery, Vendor, InvoiceCandidate
} from '../../domain/repositories';
import { ITransactionContext } from '../../../../shared/domain/repositories';
import { VendorMapper, InvoiceMapper } from '../../../../shared/infrastructure/mappers';
import { InfrastructureException } from '../../../../shared/exceptions/InfrastructureException';

@Injectable()
export class PrismaVendorRepository implements IVendorRepository {
  constructor(private readonly prisma: PrismaService) {}
  private getClient(tx?: ITransactionContext): any { return tx ? (tx as unknown as TransactionClient) : this.prisma.client; }

  async findVendorByCriteria(query: VendorQuery): Promise<Vendor | null> {
    try {
      const raw = await this.getClient().vendor.findFirst({
        where: { OR: [ { gstin: query.gstin }, { pan: query.pan }, { vendorCode: query.vendorCode } ] }
      });
      return raw ? VendorMapper.toDomain(raw) : null;
    } catch (e) {
      throw new InfrastructureException('Database error', e);
    }
  }

  async searchVendorsFuzzy(name: string, threshold: number): Promise<Vendor[]> { return []; }
  async getVendorById(id: string): Promise<Vendor | null> { return null; }
}

@Injectable()
export class PrismaInvoiceCandidateRepository implements IInvoiceCandidateRepository {
  constructor(private readonly prisma: PrismaService) {}
  private getClient(tx?: ITransactionContext): any { return tx ? (tx as unknown as TransactionClient) : this.prisma.client; }

  async saveExtractedCandidate(candidate: InvoiceCandidate, tx: ITransactionContext): Promise<void> {
    try {
      const data = InvoiceMapper.toPersistence(candidate);
      await this.getClient(tx).invoiceCandidate.upsert({
        where: { id: data.id }, create: data, update: data
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new InfrastructureException('Duplicate resource', e);
      throw new InfrastructureException('Database error', e);
    }
  }

  async existsByVendorAndInvoiceNumber(vendorId: string, invoiceNumber: string): Promise<boolean> {
    try {
      const count = await this.getClient().invoiceCandidate.count({ where: { vendorId, invoiceNumber } });
      return count > 0;
    } catch (e) {
      throw new InfrastructureException('Database error', e);
    }
  }

  async findPendingVendorMatching(): Promise<InvoiceCandidate[]> { return []; }
}
