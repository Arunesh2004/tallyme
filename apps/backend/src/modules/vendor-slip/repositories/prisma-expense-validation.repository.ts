import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IExpenseAllocationRepository } from '../interfaces/expense-validation.repository.interface';
import { DuplicateInvoiceError, TransactionFailureError } from '../exceptions/repository.exceptions';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaExpenseAllocationRepository implements IExpenseAllocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: any, tx?: any): Promise<any> {
    const client = tx || this.prisma;
    
    try {
      // Must use transaction to ensure all subcomponents are created atomically
      // By wrapping it in $transaction if not provided
      if (!tx) {
        return await this.prisma.$transaction(async (prismaTx) => {
          return this._createAtomic(data, prismaTx);
        });
      } else {
        return await this._createAtomic(data, client);
      }
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new DuplicateInvoiceError(data.vendorId, data.invoiceNumber, error);
        }
      }
      throw new TransactionFailureError('Failed to create ExpenseAllocationCandidate', error);
    }
  }

  private async _createAtomic(data: any, tx: any): Promise<any> {
    // Check for existence first for strict idempotency if we don't want to fail hard
    const existing = await tx.expenseAllocationCandidate.findUnique({
      where: {
        vendorId_invoiceNumber: {
          vendorId: data.vendorId,
          invoiceNumber: data.invoiceNumber
        }
      }
    });

    if (existing) {
      return existing; // Idempotent return
    }

    return await tx.expenseAllocationCandidate.create({
      data: {
        vendorId: data.vendorId,
        vendorMatchResultId: data.vendorMatchResultId,
        invoiceNumber: data.invoiceNumber,
        invoiceDate: data.invoiceDate,
        subtotal: data.subtotal,
        totalTax: data.totalTax,
        discount: data.discount,
        roundOff: data.roundOff,
        totalAmount: data.totalAmount,
        currency: data.currency,
        status: data.status,
        lines: {
          create: data.lines
        },
        taxBreakdown: {
          create: data.taxBreakdown
        }
      },
      include: {
        lines: true,
        taxBreakdown: true
      }
    });
  }

  async findByVendor(vendorId: string, limit = 10, offset = 0): Promise<any[]> {
    return this.prisma.expenseAllocationCandidate.findMany({
      where: { vendorId },
      take: limit,
      skip: offset,
      orderBy: { invoiceDate: 'desc' },
      include: { lines: true, taxBreakdown: true }
    });
  }

  async findByInvoice(invoiceNumber: string, vendorId: string): Promise<any> {
    return this.prisma.expenseAllocationCandidate.findUnique({
      where: {
        vendorId_invoiceNumber: {
          vendorId,
          invoiceNumber
        }
      },
      include: { lines: true, taxBreakdown: true }
    });
  }

  async findReadyForVoucher(limit = 10, offset = 0): Promise<any[]> {
    return this.prisma.expenseAllocationCandidate.findMany({
      where: {
        status: 'VALIDATED', // Assuming VALIDATED is the status when ready
        voucherCandidate: null // No voucher created yet
      },
      take: limit,
      skip: offset,
      include: { lines: true, taxBreakdown: true }
    });
  }

  async findByStatus(status: any, limit = 10, offset = 0): Promise<any[]> {
    return this.prisma.expenseAllocationCandidate.findMany({
      where: { status },
      take: limit,
      skip: offset,
      include: { lines: true, taxBreakdown: true }
    });
  }
}
