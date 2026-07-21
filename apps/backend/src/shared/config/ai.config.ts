import { registerAs } from '@nestjs/config';
import { EnvConfig } from './env.schema';

export interface AIConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export const aiConfig = registerAs('ai', (): AIConfig => {
  const env = process.env as unknown as EnvConfig;
  return {
    provider: env.AI_PROVIDER,
    apiKey: env.AI_API_KEY,
    model: env.AI_MODEL,
    timeoutMs: env.AI_TIMEOUT_MS,
  };
});
