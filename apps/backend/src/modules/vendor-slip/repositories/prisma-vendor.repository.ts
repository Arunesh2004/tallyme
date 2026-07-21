import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  IVendorRepository,
  IVendorLedgerProfileRepository,
} from '../interfaces/vendor.repository.interface';
import {
  VendorNotFoundError,
  UniqueConstraintViolationError,
  TransactionFailureError,
} from '../exceptions/repository.exceptions';
import { Prisma } from '@prisma/client';

@Injectable()
export class PrismaVendorRepository implements IVendorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, includeDeleted = false): Promise<any> {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });

    if (!vendor) {
      throw new VendorNotFoundError(`ID: ${id}`);
    }

    return vendor;
  }

  async findByGSTIN(gstin: string, includeDeleted = false): Promise<any> {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        gstin,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });

    return vendor;
  }

  async findByVendorCode(code: string, includeDeleted = false): Promise<any> {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        vendorCode: code,
        ...(includeDeleted ? {} : { deletedAt: null }),
      },
    });

    return vendor;
  }

  async searchByName(name: string, limit = 10, offset = 0): Promise<any[]> {
    return this.prisma.vendor.findMany({
      where: {
        name: {
          contains: name,
          mode: 'insensitive',
        },
        deletedAt: null,
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.vendor.count({
      where: { id, deletedAt: null },
    });
    return count > 0;
  }

  async create(data: any): Promise<any> {
    try {
      // Upsert logic for idempotency based on GSTIN if provided
      if (data.gstin) {
        return await this.prisma.vendor.upsert({
          where: { gstin: data.gstin },
          update: {}, // Don't update if it exists
          create: data,
        });
      }

      return await this.prisma.vendor.create({
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new UniqueConstraintViolationError(
            'Vendor',
            'gstin/vendorCode',
            error,
          );
        }
      }
      throw error;
    }
  }

  async update(id: string, data: any): Promise<any> {
    try {
      return await this.prisma.vendor.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new VendorNotFoundError(`ID: ${id}`);
        }
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.vendor.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new VendorNotFoundError(`ID: ${id}`);
        }
      }
      throw error;
    }
  }
}

@Injectable()
export class PrismaVendorLedgerProfileRepository implements IVendorLedgerProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByVendorId(vendorId: string): Promise<any> {
    return this.prisma.vendorLedgerProfile.findUnique({
      where: { vendorId },
    });
  }

  async createOrUpdate(vendorId: string, data: any): Promise<any> {
    try {
      return await this.prisma.vendorLedgerProfile.upsert({
        where: { vendorId },
        update: data,
        create: {
          vendorId,
          ...data,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          // Foreign key constraint failed
          throw new VendorNotFoundError(`ID: ${vendorId}`);
        }
      }
      throw error;
    }
  }
}
