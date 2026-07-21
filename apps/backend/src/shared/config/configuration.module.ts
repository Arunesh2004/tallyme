import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { loadConfiguration } from './configuration';
import { validateEnv } from './env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: loadConfiguration,
      validate: validateEnv,
      cache: true,
      expandVariables: true,
    }),
  ],
})
export class ConfigurationModule {}
