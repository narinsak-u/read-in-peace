import { nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { waitForAuthSession } from '~/utils/wait-for-auth-session';

describe('waitForAuthSession', () => {
  it('does not list identity links until delayed session state is ready', async () => {
    const ready = ref(false);
    const listAccounts = vi.fn();
    const checkingLinks = waitForAuthSession(() => ready.value).then(listAccounts);

    await nextTick();
    expect(listAccounts).not.toHaveBeenCalled();

    ready.value = true;
    await checkingLinks;
    expect(listAccounts).toHaveBeenCalledTimes(1);
  });
});
