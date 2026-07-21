import pino from 'pino'
import { env } from '../config/env'

const isDev = env.NODE_ENV === 'development'

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      }
    : undefined,
  formatters: {
    level: (label: string) => {
      return { level: label.toUpperCase() }
    },
  },
  base: {
    env: env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  },
})
