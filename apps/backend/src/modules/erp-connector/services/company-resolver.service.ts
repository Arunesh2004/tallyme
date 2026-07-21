import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ICompanyResolver {
  resolveCompanyName(requestedName?: string): string;
}

@Injectable()
export class ConfigCompanyResolver implements ICompanyResolver {
  constructor(private readonly configService: ConfigService) {}

  resolveCompanyName(requestedName?: string): string {
    // If a specific company name was requested by the payload, respect it.
    if (requestedName) {
      return requestedName;
    }

    // Otherwise fallback to the globally configured company name.
    const configCompany = this.configService.get<string>('TALLY_COMPANY_NAME');
    if (configCompany) {
      return configCompany;
    }

    // Ultimate fallback if nothing is configured
    return '';
  }
}
