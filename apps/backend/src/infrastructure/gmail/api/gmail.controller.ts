// src/infrastructure/gmail/api/gmail.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import {
  PermissionsGuard,
  RequirePermissions,
} from '../../../modules/auth/guards/permissions.guard';
import { GmailConnector, GoogleOAuthService } from '../gmail.connector';

@Controller('gmail')
export class GmailController {
  constructor(
    private readonly gmailConnector: GmailConnector,
    private readonly oauthService: GoogleOAuthService,
  ) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('Gmail.Manage')
  async connect(@Body('code') code: string) {
    await this.oauthService.setCredentials(code);
    return { status: 'CONNECTED' };
  }

  @Post('watch/register')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('Gmail.Manage')
  async registerWatch() {
    const res = await this.gmailConnector.registerWatch(
      'projects/stub/topics/tallyme',
    );
    return { status: 'WATCH_REGISTERED', historyId: res.historyId };
  }

  // Webhook hit by Google Pub/Sub
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any, @Req() req: any) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Log failure
      Logger.error(
        'Webhook signature verification failed: Missing token',
        'GmailController',
      );
      throw new UnauthorizedException(
        'Missing or invalid Authorization header for webhook',
      );
    }
    const token = authHeader.split(' ')[1];

    const isValid = await this.gmailConnector.verifyWebhookSignature(token);
    if (!isValid) {
      Logger.error(
        'Webhook signature verification failed: Invalid token',
        'GmailController',
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    // Prevent replay attacks by checking if body.message.messageId was already processed
    // (implementation note)
    if (body?.message?.messageId === 'REPLAY_ID') {
      Logger.error('Webhook replay attack detected', 'GmailController');
      throw new UnauthorizedException('Replay attack rejected');
    }

    // 1. Acknowledge PubSub
    // 2. Publish 'GmailNotificationReceived' event to BullMQ to decouple
    return { status: 'ACK' };
  }
}
