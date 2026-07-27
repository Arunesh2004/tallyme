export enum ValidationStatus {
  AUTO_APPROVED = 'AUTO_APPROVED',
  MANUAL_REVIEW = 'MANUAL_REVIEW',
  USER_CORRECTED = 'USER_CORRECTED',
  SYSTEM_CORRECTED = 'SYSTEM_CORRECTED',
  REJECTED = 'REJECTED',
}

export class ExtractionConfidence<T> {
  constructor(
    public readonly value: T,
    public readonly confidence: number,
    public readonly source: string,
    public readonly method: string,
    public validationStatus: ValidationStatus = ValidationStatus.MANUAL_REVIEW,
    public originalValue?: T,
    public correctedValue?: T,
    public correctedBy?: string,
    public correctedAt?: Date,
  ) {}

  isHighConfidence(threshold: number = 0.9): boolean {
    return this.confidence >= threshold;
  }
}
