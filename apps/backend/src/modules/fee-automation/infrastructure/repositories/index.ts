import { Injectable } from '@nestjs/common';
import { PrismaService, TransactionClient } from '../../../../infrastructure/prisma';
import { 
  IStudentRepository, 
  IOutstandingFeeRepository, 
  IPaymentCandidateRepository, 
  IStudentPaymentCandidateRepository,
  Student, OutstandingFee, PaymentCandidate, StudentPaymentCandidate
} from '../../domain/repositories';
import { ITransactionContext } from '../../../../shared/domain/repositories';
import { StudentMapper } from '../../../../shared/infrastructure/mappers';
import { InfrastructureException } from '../../../../shared/exceptions/InfrastructureException';

@Injectable()
export class PrismaStudentRepository implements IStudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: ITransactionContext): any {
    return tx ? (tx as unknown as TransactionClient) : this.prisma.client;
  }

  async findStudentByEnrollmentNumber(enrollmentNo: string): Promise<Student | null> {
    try {
      const raw = await this.getClient().student.findUnique({ where: { enrollmentNo } });
      return raw ? StudentMapper.toDomain(raw) : null;
    } catch (e) {
      throw new InfrastructureException('Database error', e);
    }
  }

  async findStudentByEmail(email: string): Promise<Student | null> {
    try {
      const raw = await this.getClient().student.findUnique({ where: { email } });
      return raw ? StudentMapper.toDomain(raw) : null;
    } catch (e) {
      throw new InfrastructureException('Database error', e);
    }
  }
}

@Injectable()
export class PrismaOutstandingFeeRepository implements IOutstandingFeeRepository {
  constructor(private readonly prisma: PrismaService) {}
  private getClient(tx?: ITransactionContext): any { return tx ? (tx as unknown as TransactionClient) : this.prisma.client; }

  async findOutstandingFeesForStudent(studentId: string): Promise<OutstandingFee[]> {
    try {
      const raw = await this.getClient().outstandingFee.findMany({ where: { studentId } });
      return raw.map(StudentMapper.toDomain);
    } catch (e) {
      throw new InfrastructureException('Database error', e);
    }
  }

  async lockAndGetOutstandingFee(feeId: string, tx: ITransactionContext): Promise<OutstandingFee | null> {
    try {
      // Postgres specific row-level lock
      const raw: any[] = await this.getClient(tx).$queryRaw`SELECT * FROM "OutstandingFee" WHERE id = ${feeId} FOR UPDATE`;
      return raw.length ? StudentMapper.toDomain(raw[0]) : null;
    } catch (e) {
      throw new InfrastructureException('Database error', e);
    }
  }

  async saveFeeAllocation(fee: OutstandingFee, tx: ITransactionContext): Promise<void> {
    try {
      const data = StudentMapper.toPersistence(fee);
      await this.getClient(tx).outstandingFee.update({ where: { id: data.id }, data });
    } catch (e) {
      throw new InfrastructureException('Database error', e);
    }
  }
}

// Stubs for the rest to satisfy compilation
@Injectable()
export class PrismaPaymentCandidateRepository implements IPaymentCandidateRepository {
  async saveIncomingPayment(c: PaymentCandidate, tx?: ITransactionContext): Promise<void> {}
  async findUnprocessedPayments(): Promise<PaymentCandidate[]> { return []; }
  async markAsProcessed(id: string, tx: ITransactionContext): Promise<void> {}
}

@Injectable()
export class PrismaStudentPaymentCandidateRepository implements IStudentPaymentCandidateRepository {
  async saveMatchedStudentPayment(c: StudentPaymentCandidate, tx: ITransactionContext): Promise<void> {}
  async findPendingFeeAllocations(): Promise<StudentPaymentCandidate[]> { return []; }
}
