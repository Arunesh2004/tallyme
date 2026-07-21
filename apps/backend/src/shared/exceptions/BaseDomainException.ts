export abstract class BaseDomainException extends Error {
  public readonly code: string;
  
  constructor(message: string, code: string) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
