import { Injectable } from '@nestjs/common';
import {
  IStudentRepository,
  PaginatedResult,
  StudentSearchFilters,
} from '../interfaces/student.repository.interface';
import { Student } from '../entities/student.entity';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaStudentMapper } from '../mappers/student.mapper';

@Injectable()
export class PrismaStudentRepository implements IStudentRepository {
  constructor(private prisma: PrismaService) {}

  async save(student: Student): Promise<void> {
    const data = PrismaStudentMapper.toPrisma(student);

    await this.prisma.student.upsert({
      where: { id: student.id },
      update: data,
      create: data,
    });
  }

  async findById(id: string): Promise<Student | null> {
    const model = await this.prisma.student.findUnique({ where: { id } });
    if (!model) return null;
    return PrismaStudentMapper.toDomain(model);
  }

  async findByAdmissionNumber(
    admissionNumber: string,
  ): Promise<Student | null> {
    const model = await this.prisma.student.findUnique({
      where: { admissionNumber },
    });
    if (!model) return null;
    return PrismaStudentMapper.toDomain(model);
  }

  async search(
    filters: StudentSearchFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Student>> {
    const whereClause: any = {};

    if (filters.searchTerm) {
      whereClause.OR = [
        { firstName: { contains: filters.searchTerm, mode: 'insensitive' } },
        { lastName: { contains: filters.searchTerm, mode: 'insensitive' } },
        {
          admissionNumber: {
            contains: filters.searchTerm,
            mode: 'insensitive',
          },
        },
      ];
    }

    if (filters.status) whereClause.status = filters.status;
    if (filters.gender) whereClause.gender = filters.gender;
    if (filters.admissionStatus)
      whereClause.admissionStatus = filters.admissionStatus;

    const skip = (page - 1) * limit;

    const [total, models] = await this.prisma.$transaction([
      this.prisma.student.count({ where: whereClause }),
      this.prisma.student.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: models.map((m) => PrismaStudentMapper.toDomain(m)),
      total,
      page,
      limit,
    };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.student.delete({ where: { id } });
  }
}
