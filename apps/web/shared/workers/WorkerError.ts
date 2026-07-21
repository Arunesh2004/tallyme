export class WorkerError extends Error {
  public readonly isTransient: boolean;
  
  constructor(message: string, isTransient: boolean = true) {
    super(message);
    this.name = 'WorkerError';
    this.isTransient = isTransient;
  }
}
