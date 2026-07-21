import { TallyResult } from '../../shared/types/TallyResult';

export interface MasterResult extends TallyResult {
  data?: any; // Used when reading a master or multiple masters
}
