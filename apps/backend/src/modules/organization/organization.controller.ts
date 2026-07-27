import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('organizations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @Roles('ACCOUNTING_ADMIN')
  async createOrganization(
    @Body() dto: { name: string; slug: string },
    @Request() req: any,
  ) {
    return this.organizationService.createOrganization(
      dto.name,
      dto.slug,
      req.user.sub,
    );
  }

  @Get()
  async getMyOrganizations(@Request() req: any) {
    return this.organizationService.getUserOrganizations(req.user.sub);
  }

  @Post(':id/companies')
  @Roles('ACCOUNTING_ADMIN')
  async addCompany(@Param('id') orgId: string, @Body() dto: { name: string }) {
    return this.organizationService.createCompany(orgId, dto.name);
  }

  @Get(':id/companies')
  async getOrgCompanies(@Param('id') orgId: string, @Request() req: any) {
    return this.organizationService.getOrganizationCompanies(orgId);
  }

  @Get(':id/export')
  @Roles('ACCOUNTING_ADMIN')
  async exportData(@Param('id') orgId: string, @Request() req: any) {
    return this.organizationService.exportOrganizationData(orgId, req.user.sub);
  }
}
