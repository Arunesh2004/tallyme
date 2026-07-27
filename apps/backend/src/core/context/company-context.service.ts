import { Injectable, UnauthorizedException } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

@Injectable()
export class CompanyContextService {
  /**
   * Retrieves the current company ID from the request context.
   * Throws an error if not found, to prevent fallback to fake IDs.
   */
  getCompanyId(): string {
    const context = RequestContextService.getContext();
    if (!context || !context.tenantId) {
      throw new UnauthorizedException('Company context (tenantId) is missing');
    }
    return context.tenantId;
  }

  /**
   * Manually sets the company ID in the current request context.
   */
  setCompanyId(companyId: string): void {
    const context = RequestContextService.getContext();
    if (context) {
      context.tenantId = companyId;
    }
  }
}
