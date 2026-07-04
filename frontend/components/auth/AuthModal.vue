<script setup lang="ts">
import { onMounted, useTemplateRef } from "vue";
import { useAuthStore } from "~/stores/auth";
import { validateSignIn, validateSignUp } from "~/utils/auth-schemas";

const emit = defineEmits<{
  close: [];
}>();

const modalRef = useTemplateRef<HTMLDivElement>("modal");

onMounted(() => {
  const firstInput = modalRef.value?.querySelector<HTMLElement>(
    "input, button, select, textarea, [href]",
  );
  firstInput?.focus();
});

function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    emit("close");
    return;
  }
  if (e.key !== "Tab") return;
  const focusable = modalRef.value?.querySelectorAll<HTMLElement>(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );
  if (!focusable || focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

const auth = useAuthStore();

const tab = shallowRef<"sign-in" | "sign-up">("sign-in");
const email = shallowRef("");
const password = shallowRef("");
const name = shallowRef("");
const error = shallowRef("");
const submitting = shallowRef(false);

function validate(): boolean {
  if (tab.value === "sign-in") {
    const msg = validateSignIn({
      email: email.value,
      password: password.value,
    });
    if (msg) {
      error.value = msg;
      return false;
    }
  } else {
    const msg = validateSignUp({
      name: name.value,
      email: email.value,
      password: password.value,
    });
    if (msg) {
      error.value = msg;
      return false;
    }
  }
  return true;
}

async function handleSubmit() {
  error.value = "";
  if (!validate()) return;
  submitting.value = true;
  try {
    if (tab.value === "sign-in") {
      await auth.signIn(email.value, password.value);
    } else {
      await auth.signUp(name.value, email.value, password.value);
    }
    emit("close");
  } catch (err: any) {
    error.value = err?.data?.message || err?.message || "Something went wrong";
  } finally {
    submitting.value = false;
  }
}

function switchTab(t: "sign-in" | "sign-up") {
  tab.value = t;
  error.value = "";
}
</script>

<template>
  <div
    ref="modalRef"
    class="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
    role="dialog"
    aria-modal="true"
    aria-labelledby="auth-title"
    @keydown="onKeydown"
    @click.self="emit('close')"
  >
    <AuthForm
      v-model:email="email"
      v-model:password="password"
      v-model:name="name"
      :tab="tab"
      :error="error"
      :submitting="submitting"
      @submit="handleSubmit"
      @switch-tab="switchTab"
    />
  </div>
</template>
