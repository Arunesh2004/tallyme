import { CreateMasterDTO } from '../dto/CreateMasterDTO';
import { MasterType } from '../entities/MasterType';

export class MasterMapper {
  /**
   * Casts the DTO to the specific Domain Entity based on masterType.
   * In a more complex domain, this would construct rich entities.
   * Here, we just extract the relevant fields mapped strictly to the Entity interfaces.
   */
  public static toEntity(dto: CreateMasterDTO): any {
    // Strip masterType and return pure entity
    const { masterType, ...rest } = dto;
    return rest;
  }
}
