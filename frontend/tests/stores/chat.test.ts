import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useChatStore } from '~/stores/chat';

describe('useChatStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('starts closed and collapsed', () => {
    const store = useChatStore();

    expect(store.showModal).toBe(false);
    expect(store.activeUserId).toBeNull();
  });

  it('opens the modal', () => {
    const store = useChatStore();
    store.open();
    expect(store.showModal).toBe(true);
  });

  it('closes the modal and resets active user', () => {
    const store = useChatStore();
    store.open();
    store.openConversation('u2');
    store.close();

    expect(store.showModal).toBe(false);
    expect(store.activeUserId).toBeNull();
  });

  it('opens a conversation', () => {
    const store = useChatStore();
    store.openConversation('u2');

    expect(store.showModal).toBe(true);
    expect(store.activeUserId).toBe('u2');
  });

  it('closes conversation returns to conversation list', () => {
    const store = useChatStore();
    store.openConversation('u2');
    store.closeConversation();

    expect(store.showModal).toBe(true);
    expect(store.activeUserId).toBeNull();
  });
});
