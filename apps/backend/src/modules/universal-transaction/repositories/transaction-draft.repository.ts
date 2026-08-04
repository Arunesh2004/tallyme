import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CanonicalAccountingModel } from '../domain/types';
import { TransactionStatus, AuditAction, Prisma, TransactionDraft } from '@prisma/client';

@Injectable()
export class TransactionDraftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(
    payload: CanonicalAccountingModel,
    userId: string,
    tx?: any
  ): Promise<TransactionDraft> {
    const client = tx || this.prisma;
    const draft = await client.transactionDraft.create({
      data: {
        tenantId: payload.header.tenantId,
        payload: payload as unknown as Prisma.InputJsonValue,
        status: TransactionStatus.DRAFT,
        version: 1,
        createdBy: userId,
        updatedBy: userId,
        auditVersion: 1
      }
    });

    await client.transactionAuditLog.create({
      data: {
        transactionId: draft.id,
        action: AuditAction.CREATED,
        userId,
        reason: 'Draft created',
        sourceModule: 'TransactionDraftRepository',
        previousVersion: 0,
        newVersion: 1,
        delta: payload as unknown as Prisma.InputJsonValue,
      },
    });

    return draft;
  }

  /**
   * Implements strict Optimistic Locking (Refinement #2).
   * 
   * Updates follow the pattern: UPDATE ... WHERE id = ? AND version = ?
   * If the version no longer matches, it rejects the update and returns a ConflictException.
   * It NEVER silently overwrites another user's work.
   * It increments the version ONLY after a successful update.
   */
  async updateDraftWithOptimisticLocking(
    id: string,
    currentVersion: number,
    userId: string,
    payload: CanonicalAccountingModel,
    status: TransactionStatus,
    reason?: string,
    tx?: Prisma.TransactionClient
  ) {
    const doUpdate = async (client: Prisma.TransactionClient) => {
      // 1. Attempt to update ONLY if the version matches exactly
      const updateResult = await client.transactionDraft.updateMany({
        where: {
          id: id,
          version: currentVersion,
        },
        data: {
          payload: payload as unknown as Prisma.InputJsonValue,
          status,
          version: {
            increment: 1, // Increment version upon successful update
          },
          updatedBy: userId,
          auditVersion: {
            increment: 1,
          }
        },
      });

      // 2. If no rows were updated, it means either the ID doesn't exist, OR the version mismatched.
      if (updateResult.count === 0) {
        const draftExists = await client.transactionDraft.findUnique({ where: { id } });
        if (!draftExists) {
          throw new NotFoundException(`TransactionDraft with ID ${id} not found.`);
        }
        
        // If it exists but wasn't updated, the version didn't match.
        throw new ConflictException(
          `Optimistic locking failure: TransactionDraft ${id} was modified by another user. Please refresh and try again.`
        );
      }

      // 3. Fetch the newly updated row to record in the audit log
      const updatedDraft = await client.transactionDraft.findUnique({ where: { id } });

      // 4. Record the Audit Log (Refinement #5 - Scalable append-only log)
      await client.transactionAuditLog.create({
        data: {
          transactionId: id,
          action: AuditAction.UPDATED,
          userId,
          reason,
          sourceModule: 'TransactionDraftRepository',
          previousVersion: currentVersion,
          newVersion: currentVersion + 1,
          delta: payload as unknown as Prisma.InputJsonValue, // Storing full payload snapshot for now, can be optimized to actual diffs later for scalability
        },
      });

      return updatedDraft;
    };

    if (tx) {
      return doUpdate(tx);
    }
    return this.prisma.$transaction(doUpdate);
  }
}
