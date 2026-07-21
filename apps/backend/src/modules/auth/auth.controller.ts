// src/modules/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Request } from 'express';

// Stubs for DTOs
export class LoginDto { email!: string; password!: string; }
export class RefreshTokenDto { refreshToken!: string; }

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    // In a real implementation this would call:
    // return this.authService.login(loginDto);
    return {
      accessToken: 'STUB_ACCESS_TOKEN',
      refreshToken: 'STUB_REFRESH_TOKEN'
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() refreshDto: RefreshTokenDto) {
    // return this.authService.refresh(refreshDto.refreshToken);
    return { accessToken: 'NEW_STUB_ACCESS_TOKEN' };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const user = req.user as any;
    // await this.authService.logout(user.userId, req.body.refreshToken);
    return { message: 'Logged out successfully' };
  }
}
