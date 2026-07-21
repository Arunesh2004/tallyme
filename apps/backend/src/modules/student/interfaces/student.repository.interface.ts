import { Student } from '../entities/student.entity';

export const STUDENT_REPOSITORY = 'STUDENT_REPOSITORY';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface StudentSearchFilters {
  searchTerm?: string;
  status?: string;
  gender?: string;
  admissionStatus?: string;
}

export interface IStudentRepository {
  save(student: Student): Promise<void>;
  findById(id: string): Promise<Student | null>;
  findByAdmissionNumber(admissionNumber: string): Promise<Student | null>;
  search(
    filters: StudentSearchFilters,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<Student>>;
  delete(id: string): Promise<void>;
}
