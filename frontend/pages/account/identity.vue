<script setup lang="ts">
import { Button } from '~/components/ui/button';
import { authClient } from '~/lib/auth-client';
import { useAuthStore } from '~/stores/auth';

definePageMeta({
  title: 'Central Identity link — Read in Peace',
  description: 'Link a Central Identity to an existing Reading Application User.',
});

const auth = useAuthStore();
const route = useRoute();
const checking = ref(true);
const linking = ref(false);
const linked = ref(false);
const error = ref(route.query.error ? 'Central Identity could not be linked. If it belongs to another Application User, stop and request reviewed recovery; do not create a replacement account.' : '');

onMounted(async () => {
  const result = await authClient.listAccounts();
  linked.value = result.data?.some((account) => account.providerId === 'central-identity') ?? false;
  if (result.error && auth.signedIn) error.value = 'Account links could not be checked. Try again later.';
  if (route.query.linked === '1' && !linked.value) error.value = 'Central Identity could not be linked. Stop and request reviewed recovery; do not create a replacement account.';
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
</script>

<template>
  <main id="main-content" class="mx-auto max-w-2xl px-6 py-12">
    <h1 class="font-serif text-3xl">Central Identity link</h1>
    <p class="mt-4">Link Central Identity to your signed-in Read in Peace Application User. You will prove control of Central Identity separately. Your reading profile, purchases, memberships, and permissions remain with this user.</p>
    <p v-if="checking" role="status" class="mt-6">Checking account links…</p>
    <p v-else-if="!auth.signedIn" role="alert" class="mt-6">Sign in to your existing Read in Peace user before linking. Never create a replacement account to recover a link.</p>
    <p v-else-if="linked" role="status" class="mt-6">Identity linked to this Application User.</p>
    <template v-else>
      <p v-if="error" role="alert" class="mt-6">{{ error }}</p>
      <Button :disabled="linking" class="mt-6" @click="linkCentralIdentity">
        {{ linking ? 'Continue to Central Identity…' : 'Link Central Identity' }}
      </Button>
    </template>
  </main>
</template>
