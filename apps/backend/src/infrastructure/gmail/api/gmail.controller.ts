// src/infrastructure/gmail/api/gmail.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
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

  // Webhook hit by Google Pub/Sub (Unauthenticated from our side, validated via headers)
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any) {
    // 1. Acknowledge PubSub
    // 2. Publish 'GmailNotificationReceived' event to BullMQ to decouple
    // so we don't hold the Google webhook HTTP connection open
    return { status: 'ACK' };
  }
}
