import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { VmmsAdminService } from '../application/vmms-admin.service';
import { ResolveMismatchDto, CreateAliasDto } from './dto/vmms-admin.dto';

@Controller('vmms/admin')
export class VmmsAdminController {
  constructor(private readonly adminService: VmmsAdminService) {}

  @Post('resolve-mismatch')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true }))
  public async resolveMismatch(@Body() body: ResolveMismatchDto) {
    // We assume the user making this call has been authenticated in a real app.
    // For this architecture exercise, we'll pass a dummy 'admin-user' ID.
    await this.adminService.resolveMismatch(body, 'admin-user');
  }

  @Post('create-alias')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  public async createAlias(@Body() body: CreateAliasDto) {
    const alias = await this.adminService.createAlias(body, 'admin-user');
    return alias;
  }
}
