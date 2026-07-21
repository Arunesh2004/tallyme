import { Student } from '../entities/student.entity';
import { Student as PrismaStudentModel } from '@prisma/client';
import {
  StudentStatus,
  AdmissionStatus,
  Gender,
} from '../constants/student.constants';

export class PrismaStudentMapper {
  static toDomain(prismaStudent: PrismaStudentModel): Student {
    return Student.reconstitute({
      id: prismaStudent.id,
      admissionNumber: prismaStudent.admissionNumber,
      firstName: prismaStudent.firstName,
      lastName: prismaStudent.lastName,
      email: prismaStudent.email,
      phone: prismaStudent.phone,
      dateOfBirth: prismaStudent.dateOfBirth,
      gender: prismaStudent.gender as Gender,
      status: prismaStudent.status as StudentStatus,
      admissionStatus: prismaStudent.admissionStatus as AdmissionStatus,
      enrollmentDate: prismaStudent.enrollmentDate,
      guardianId: prismaStudent.guardianId,
      createdAt: prismaStudent.createdAt,
      updatedAt: prismaStudent.updatedAt,
      archivedAt: prismaStudent.archivedAt,
    });
  }

  static toPrisma(student: Student): PrismaStudentModel {
    const props = student.getProps();
    return {
      id: props.id,
      admissionNumber: props.admissionNumber,
      firstName: props.firstName,
      lastName: props.lastName,
      email: props.email,
      phone: props.phone,
      dateOfBirth: props.dateOfBirth,
      gender: props.gender,
      status: props.status,
      admissionStatus: props.admissionStatus,
      enrollmentDate: props.enrollmentDate,
      guardianId: props.guardianId,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
      archivedAt: props.archivedAt,
    };
  }
}

export class StudentResponseMapper {
  static toResponse(student: Student) {
    const props = student.getProps();
    return {
      id: props.id,
      admissionNumber: props.admissionNumber,
      firstName: props.firstName,
      lastName: props.lastName,
      email: props.email,
      phone: props.phone,
      status: props.status,
      admissionStatus: props.admissionStatus,
      enrollmentDate: props.enrollmentDate.toISOString(),
    };
  }
}
