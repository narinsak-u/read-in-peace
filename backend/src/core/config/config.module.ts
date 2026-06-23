// @Global is justified here: every feature consumes CoreConfigService, and
// importing CoreConfigModule in every feature module would add noise without
// value. The official Nest docs explicitly call out config as a valid @Global
// case.
import { Global, Module } from '@nestjs/common';
import { CoreConfigService } from './config.provider';

@Global()
@Module({
  providers: [
    {
      provide: CoreConfigService,
      useFactory: () => new CoreConfigService(process.env),
    },
  ],
  exports: [CoreConfigService],
})
export class CoreConfigModule {}
