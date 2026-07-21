import { appConfig } from './app.config';
import { databaseConfig } from './database.config';
import { redisConfig } from './redis.config';
import { bullMQConfig } from './bullmq.config';
import { gmailConfig } from './gmail.config';
import { aiConfig } from './ai.config';
import { erpConfig } from './erp.config';
import { loggingConfig } from './logging.config';
import { securityConfig } from './security.config';

export const loadConfiguration = [
  appConfig,
  databaseConfig,
  redisConfig,
  bullMQConfig,
  gmailConfig,
  aiConfig,
  erpConfig,
  loggingConfig,
  securityConfig
];
