import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ProcessPaymentEmailUseCase } from '../use-cases/process-payment-email.use-case';
import { ProcessEmailRequestDto } from '../dto/parser.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Permissions } from '../../auth/authorization/decorators/permissions.decorator';
import { PermissionGuard } from '../../auth/authorization/guards/permission.guard';

@Controller('payment-parser')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PaymentParserController {
  constructor(
    private readonly processEmailUseCase: ProcessPaymentEmailUseCase,
  ) {}

  @Post('process')
  @Permissions('admin:payment-parser:process')
  async process(@Body() dto: ProcessEmailRequestDto) {
    // In reality this would fetch the email from MailRepository.
    // Mocking email payload for milestone decoupling constraints.
    const mockEmail = {
      id: dto.emailId,
      sender: 'alerts@razorpay.com',
      subject: 'Payment Received',
      messageId: `msg_${Date.now()}`,
    };

    await this.processEmailUseCase.execute(mockEmail);
    return { success: true, message: 'Email queued for parsing' };
  }
}
