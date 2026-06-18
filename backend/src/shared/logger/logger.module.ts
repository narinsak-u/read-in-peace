import { Module } from '@nestjs/common';
import { LoggerModule } from 'nestjs-pino';
import { ConfigService } from '../../config/config.provider';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
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
  providers: [],
  exports: [LoggerModule],
})
export class AppLoggerModule {}
