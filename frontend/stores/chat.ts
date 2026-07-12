import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useChatStore = defineStore('chat', () => {
  const showModal = ref(false);
  const activeUserId = ref<string | null>(null);

  function open() {
    showModal.value = true;
  }

  function close() {
    showModal.value = false;
    activeUserId.value = null;
  }

  function toggle() {
    showModal.value = !showModal.value;
    if (!showModal.value) {
      activeUserId.value = null;
    }
  }

  function openConversation(userId: string) {
    showModal.value = true;
    activeUserId.value = userId;
  }

  function closeConversation() {
    activeUserId.value = null;
  }

  return {
    showModal,
    activeUserId,
    open,
    close,
    toggle,
    openConversation,
    closeConversation,
  };
});
