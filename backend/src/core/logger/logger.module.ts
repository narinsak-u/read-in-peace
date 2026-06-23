// Configures the pino HTTP logger with level and pretty-print from CoreConfig.
// Every controller and service injects PinoLogger for structured request-scoped logging.
import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { CoreConfigService } from '../config/config.provider';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [CoreConfigService],
      useFactory: (config: CoreConfigService) => ({
        pinoHttp: {
          level: config.server.logLevel,
          transport:
            config.server.nodeEnv === 'development'
              ? { target: 'pino-pretty' }
              : undefined,
        },
      }),
    }),
  ],
  exports: [LoggerModule],
})
export class CoreLoggerModule {}
