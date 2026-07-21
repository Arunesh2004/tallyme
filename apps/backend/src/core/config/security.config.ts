import { registerAs } from '@nestjs/config';

export const securityConfig = registerAs('security', () => ({
  bcryptSaltRounds: parseInt(process.env.SECURITY_BCRYPT_ROUNDS || '12', 10),
}));
