export enum MasterResolutionStatus {
  FOUND = 'FOUND',
  NOT_FOUND = 'NOT_FOUND',
  MULTIPLE_MATCHES = 'MULTIPLE_MATCHES',
  REQUIRES_APPROVAL = 'REQUIRES_APPROVAL',
}

export interface MasterResolutionResult<T> {
  status: MasterResolutionStatus;
  matchedMaster?: T;
  recommendation?: Partial<T>;
  confidence: number;
  evidence: string[];
}

export interface IMasterResolver<InputType, OutputType> {
  resolve(input: InputType): Promise<MasterResolutionResult<OutputType>>;
}
