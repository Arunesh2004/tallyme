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
      admissionNumber:
        prismaStudent.admissionNumber || prismaStudent.enrollmentNo,
      firstName: prismaStudent.firstName || '',
      lastName: prismaStudent.lastName || '',
      email: prismaStudent.email,
      phone: prismaStudent.phone,
      dateOfBirth: prismaStudent.dateOfBirth || new Date(0),
      gender: (prismaStudent.gender as Gender) || Gender.OTHER,
      status: (prismaStudent.status as StudentStatus) || StudentStatus.ACTIVE,
      admissionStatus:
        (prismaStudent.admissionStatus as AdmissionStatus) ||
        AdmissionStatus.APPLIED,
      enrollmentDate: prismaStudent.enrollmentDate || new Date(0),
      guardianId: prismaStudent.guardianId,
      createdAt: prismaStudent.createdAt,
      updatedAt: prismaStudent.updatedAt,
      archivedAt: prismaStudent.archivedAt,
      class: prismaStudent.class,
      section: prismaStudent.section,
      academicYear: prismaStudent.academicYear,
    });
  }

  static toPrisma(student: Student): PrismaStudentModel {
    const props = student.getProps();
    return {
      id: props.id,
      enrollmentNo: props.admissionNumber, // Fallback mapping for older schema
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
      class: props.class || null,
      section: props.section || null,
      academicYear: props.academicYear || null,
      organizationId: null,
      companyId: null,
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
