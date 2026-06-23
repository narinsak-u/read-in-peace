import { SetMetadata } from '@nestjs/common';

export const POLICIES_KEY = 'policies';

export const Policies = (
  ...tokens: string[]
): MethodDecorator & ClassDecorator => SetMetadata(POLICIES_KEY, tokens);
