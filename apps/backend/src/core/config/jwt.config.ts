import { registerAs } from '@nestjs/config';

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  clockTolerance: parseInt(process.env.JWT_CLOCK_TOLERANCE || '30', 10),
  issuer: process.env.JWT_ISSUER || 'tallyme',
  audience: process.env.JWT_AUDIENCE || 'tallyme-app',
}));
