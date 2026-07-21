import { registerAs } from '@nestjs/config';

export const authConfig = registerAs('auth', () => ({
  defaultStrategy: 'jwt',
}));
