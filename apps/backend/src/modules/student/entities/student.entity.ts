import {
  StudentStatus,
  AdmissionStatus,
  Gender,
} from '../constants/student.constants';
import {
  StudentValidationException,
  InvalidStudentStateException,
  StudentAlreadyArchivedException,
} from '../exceptions/student.exceptions';

export interface StudentProps {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  gender: Gender;
  email: string | null;
  phone: string | null;
  status: StudentStatus;
  admissionStatus: AdmissionStatus;
  enrollmentDate: Date;
  guardianId: string | null;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}

export class Student {
  private props: StudentProps;

  private constructor(props: StudentProps) {
    this.props = props;
    this.validate();
  }

  public static create(
    props: Omit<
      StudentProps,
      | 'id'
      | 'createdAt'
      | 'updatedAt'
      | 'archivedAt'
      | 'status'
      | 'admissionStatus'
      | 'enrollmentDate'
    > &
      Partial<StudentProps>,
  ): Student {
    const student = new Student({
      ...props,
      id: props.id || crypto.randomUUID(),
      status: props.status || StudentStatus.ACTIVE,
      admissionStatus: props.admissionStatus || AdmissionStatus.APPLIED,
      enrollmentDate: props.enrollmentDate || new Date(),
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date(),
      archivedAt: props.archivedAt || null,
      guardianId: props.guardianId || null,
    });
    return student;
  }

  public static reconstitute(props: StudentProps): Student {
    return new Student(props);
  }

  get id() {
    return this.props.id;
  }
  get admissionNumber() {
    return this.props.admissionNumber;
  }
  get firstName() {
    return this.props.firstName;
  }
  get lastName() {
    return this.props.lastName;
  }
  get email() {
    return this.props.email;
  }
  get status() {
    return this.props.status;
  }
  get dateOfBirth() {
    return this.props.dateOfBirth;
  }
  get gender() {
    return this.props.gender;
  }
  get isArchived() {
    return this.props.archivedAt !== null;
  }

  public getProps(): StudentProps {
    return { ...this.props };
  }

  public archive(): void {
    if (this.isArchived) {
      throw new StudentAlreadyArchivedException(this.id);
    }
    this.props.status = StudentStatus.ARCHIVED;
    this.props.archivedAt = new Date();
    this.props.updatedAt = new Date();
  }

  public restore(): void {
    if (!this.isArchived) {
      throw new InvalidStudentStateException(this.props.status, 'restore');
    }
    this.props.status = StudentStatus.ACTIVE;
    this.props.archivedAt = null;
    this.props.updatedAt = new Date();
  }

  public changeStatus(newStatus: StudentStatus): void {
    if (this.isArchived) {
      throw new InvalidStudentStateException('ARCHIVED', 'changeStatus');
    }
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
  }

  public update(
    props: Partial<
      Omit<StudentProps, 'id' | 'createdAt' | 'archivedAt' | 'admissionNumber'>
    >,
  ): void {
    if (this.isArchived) {
      throw new InvalidStudentStateException('ARCHIVED', 'update');
    }
    this.props = { ...this.props, ...props, updatedAt: new Date() };
    this.validate();
  }

  private validate(): void {
    if (!this.props.firstName || this.props.firstName.trim().length === 0) {
      throw new StudentValidationException('First name is required');
    }
    if (!this.props.lastName || this.props.lastName.trim().length === 0) {
      throw new StudentValidationException('Last name is required');
    }
    if (
      !this.props.admissionNumber ||
      this.props.admissionNumber.trim().length === 0
    ) {
      throw new StudentValidationException('Admission number is required');
    }

    // Naive age validation (domain logic)
    const age = new Date().getFullYear() - this.props.dateOfBirth.getFullYear();
    if (age < 3 || age > 100) {
      throw new StudentValidationException(
        'Student age must be between 3 and 100 years',
      );
    }
  }
}
