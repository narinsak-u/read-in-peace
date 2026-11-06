import { watch } from 'vue';

export function waitForAuthSession(isReady: () => boolean): Promise<void> {
  if (isReady()) return Promise.resolve();
  const { promise, resolve } = Promise.withResolvers<void>();
  const stop = watch(isReady, (ready) => {
    if (ready) {
      stop();
      resolve();
    }
  });
  return promise;
}
