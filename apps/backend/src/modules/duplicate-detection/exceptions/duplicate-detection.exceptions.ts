export class DuplicateDetectedException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateDetectedException';
  }
}

export class DuplicatePolicyException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicatePolicyException';
  }
}

export class DuplicateEngineUnavailableException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateEngineUnavailableException';
  }
}
