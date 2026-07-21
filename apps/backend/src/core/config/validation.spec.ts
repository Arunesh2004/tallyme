import { validateEnv } from './validation';

describe('Environment Configuration Validation', () => {
  it('should validate valid environment variables', () => {
    const validConfig = {
      NODE_ENV: 'test',
      PORT: '4000',
      LOG_LEVEL: 'info',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
      JWT_SECRET: 'this-is-a-very-long-secret-key-that-is-at-least-32-chars',
    };

    const result = validateEnv(validConfig);
    expect(result.NODE_ENV).toBe('test');
    expect(result.PORT).toBe(4000);
    expect(result.DATABASE_URL).toBe(
      'postgresql://user:pass@localhost:5432/db',
    );
  });

  it('should throw an error on invalid environment variables', () => {
    const invalidConfig = {
      PORT: 'not-a-number',
      DATABASE_URL: 'invalid-url',
    };

    expect(() => validateEnv(invalidConfig)).toThrow(
      'Invalid environment variables',
    );
  });
});
