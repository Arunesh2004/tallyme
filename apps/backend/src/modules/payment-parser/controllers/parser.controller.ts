import {
  Controller,
  Post,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ProcessPaymentEmailUseCase } from '../use-cases/process-payment-email.use-case';
import { ProcessEmailRequestDto } from '../dto/parser.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../auth/authorization/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';
import { PrismaService } from '../../../infrastructure/database/prisma.service';

@Controller('payment-parser')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentParserController {
  constructor(
    private readonly processEmailUseCase: ProcessPaymentEmailUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post('process')
  @Permissions('admin:payment-parser:process')
  async process(@Body() dto: ProcessEmailRequestDto) {
    const emailDocument = await this.prisma.emailDocument.findUnique({
      where: { id: dto.emailId },
    });

    if (!emailDocument) {
      throw new NotFoundException(
        `Email document with ID ${dto.emailId} not found`,
      );
    }

    await this.processEmailUseCase.execute(emailDocument);
    return { success: true, message: 'Email queued for parsing' };
  }
}
