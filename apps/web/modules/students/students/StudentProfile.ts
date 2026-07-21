export interface StudentProfile {
  id: string;
  admissionNumber: string;
  rollNumber?: string;
  studentName: string;
  fatherName?: string;
  motherName?: string;
  class: string;
  section?: string;
  academicSession: string;
  status: string; // ACTIVE, INACTIVE, ALUMNI
  phone?: string;
  email?: string;
  metadata?: any;
  feeStructureId?: string;
}
