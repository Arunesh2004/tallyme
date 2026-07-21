import { HttpException, HttpStatus } from '@nestjs/common';

export class StudentDomainException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    cause?: Error,
  ) {
    super(message, status, { cause });
  }
}

export class StudentNotFoundException extends StudentDomainException {
  constructor(idOrAdmissionNumber: string) {
    super(
      `Student with identifier ${idOrAdmissionNumber} not found`,
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DuplicateAdmissionNumberException extends StudentDomainException {
  constructor(admissionNumber: string) {
    super(
      `Student with admission number ${admissionNumber} already exists`,
      HttpStatus.CONFLICT,
    );
  }
}

export class StudentValidationException extends StudentDomainException {
  constructor(message: string) {
    super(message, HttpStatus.UNPROCESSABLE_ENTITY);
  }
}

export class StudentAlreadyArchivedException extends StudentDomainException {
  constructor(id: string) {
    super(`Student ${id} is already archived`, HttpStatus.CONFLICT);
  }
}

export class InvalidStudentStateException extends StudentDomainException {
  constructor(currentState: string, attemptedAction: string) {
    super(
      `Cannot perform ${attemptedAction} when student is in ${currentState} state`,
      HttpStatus.CONFLICT,
    );
  }
}
