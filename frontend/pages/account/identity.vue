<script setup lang="ts">
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';
import { useAuthStore } from '~/stores/auth';
import { waitForAuthSession } from '~/utils/wait-for-auth-session';

definePageMeta({
  title: 'Central Identity link — Read in Peace',
  description: 'Link a Central Identity to an existing Reading Application User.',
});

const auth = useAuthStore();
const route = useRoute();
const checking = ref(true);
const linking = ref(false);
const recovering = ref(false);
const recoveryEmail = ref('');
const recoveryPassword = ref('');
const linked = ref(false);
const error = ref(
  route.query.error === 'recovery'
    ? 'Reviewed recovery failed. Neither identity was linked; resolve proof or mapping conflicts before retrying.'
    : route.query.error === 'login'
      ? 'Central Identity sign-in could not be completed. Existing unlinked users must use Reviewed Recovery; matching email never links accounts.'
      : route.query.error
        ? 'Central Identity could not be linked. If it belongs to another Application User, stop and request reviewed recovery; do not create a replacement account.'
        : '',
);
const recovered = route.query.recovered === '1';

onMounted(async () => {
  await waitForAuthSession(() => auth.sessionReady);
  if (auth.signedIn) {
    const result = await authClient.listAccounts();
    linked.value = result.data?.some((account) => account.providerId === 'central-identity') ?? false;
    if (result.error) error.value = 'Account links could not be checked. Try again later.';
    if (route.query.linked === '1' && !linked.value) error.value = 'Central Identity could not be linked. Stop and request reviewed recovery; do not create a replacement account.';
  }
  checking.value = false;
});

async function linkCentralIdentity() {
  if (!auth.signedIn) return;
  linking.value = true;
  error.value = '';
  try {
    const result = await authClient.linkSocial({
      provider: 'central-identity',
      callbackURL: '/account/identity?linked=1',
      errorCallbackURL: '/account/identity?error=link',
    });
    if (result.error) throw new Error(result.error.message);
  } catch {
    error.value = 'Central Identity could not be linked. If it belongs to another Application User, stop and request reviewed recovery; do not create a replacement account.';
    linking.value = false;
  }
}

async function recoverIdentity() {
  recovering.value = true;
  error.value = '';
  try {
    const result = await $fetch<{ authorizationUrl: string }>('/api/identity-recovery/start', {
      method: 'POST',
      body: { email: recoveryEmail.value, password: recoveryPassword.value },
    });
    recoveryPassword.value = '';
    window.location.assign(result.authorizationUrl);
  } catch {
    error.value = 'Recovery proof failed. Check your existing Read in Peace credentials and try again.';
    recoveryPassword.value = '';
    recovering.value = false;
  }
}

async function recoverWithProvider(provider: 'google' | 'github') {
  recovering.value = true;
  error.value = '';
  try {
    const result = await $fetch<{ authorizationUrl: string }>('/api/identity-recovery/provider', {
      method: 'POST',
      body: { provider },
    });
    window.location.assign(result.authorizationUrl);
  } catch {
    error.value = 'Recovery proof failed. Use the provider already linked to your existing Read in Peace account.';
    recovering.value = false;
  }
}
</script>

<template>
  <main id="main-content" class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="font-serif text-3xl">Central Identity link</h1>
    <p class="mt-4">Link Central Identity to your signed-in Read in Peace Application User. You will prove control of Central Identity separately. Your reading profile, purchases, memberships, and permissions remain with this user.</p>
    <p v-if="checking" role="status" class="mt-6">Checking account links…</p>
    <p v-else-if="recovered" role="status" class="mt-6">Identity link recorded. Sign in through Central Identity to continue with your existing reading account and data.</p>
    <section v-else-if="!auth.signedIn" class="mt-6 space-y-6">
      <p>Prove control of your existing Read in Peace account, then prove your Central Identity. Recovery creates no Application Session and never links by email alone.</p>
      <form class="space-y-3" @submit.prevent="recoverIdentity">
        <label class="block">
          <span class="text-sm font-medium">Existing account email</span>
          <input v-model="recoveryEmail" type="email" autocomplete="username" required class="mt-1 w-full rounded-md border bg-background px-3 py-2">
        </label>
        <label class="block">
          <span class="text-sm font-medium">Existing account password</span>
          <input v-model="recoveryPassword" type="password" autocomplete="current-password" required class="mt-1 w-full rounded-md border bg-background px-3 py-2">
        </label>
        <Button type="submit" :disabled="recovering">
          {{ recovering ? 'Starting recovery…' : 'Prove account with password' }}
        </Button>
      </form>
      <div>
        <p class="text-sm">Or prove control using a provider already linked to your existing account:</p>
        <div class="mt-3 flex gap-3">
          <Button :disabled="recovering" @click="recoverWithProvider('google')">Google</Button>
          <Button :disabled="recovering" @click="recoverWithProvider('github')">GitHub</Button>
        </div>
      </div>
      <p v-if="error" role="alert">{{ error }}</p>
    </section>
    <p v-else-if="linked" role="status" class="mt-6">Identity linked to this Application User.</p>
    <template v-else>
      <p v-if="error" role="alert" class="mt-6">{{ error }}</p>
      <Button :disabled="linking" class="mt-6" @click="linkCentralIdentity">
        {{ linking ? 'Continue to Central Identity…' : 'Link Central Identity' }}
      </Button>
    </template>
  </main>
</template>
