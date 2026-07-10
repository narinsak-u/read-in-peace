<script setup lang="ts">
import { BookOpen } from "lucide-vue-next";
import { useProfile } from "~/composables/useProfile";
import { useFollow } from "~/composables/useFollow";
import ProfileInfo from "~/components/profile/ProfileInfo.vue";
import StatsRadar from "~/components/profile/StatsRadar.vue";

definePageMeta({
  title: "Profile — Read in Peace",
  description: "User profile and reading stats by category.",
});

const { flash } = useFlash();
const route = useRoute();
const userId = computed(() => route.params.id as string);
const { profile, loading, error, refresh } = useProfile(userId.value);
const { error: followError, toggle } = useFollow();

watch(error, (err) => {
  if (err) flash("Could not load profile");
});

watch(followError, (err) => {
  if (err) flash(err);
});

watch(userId, () => refresh());

function onFollow() {
  toggle(userId.value, (result) => {
    if (profile.value) {
      profile.value = {
        ...profile.value,
        follow: {
          following: result.following,
          followerCount: result.followerCount,
        },
      };
    }
  });
}
</script>

<template>
  <div class="min-h-screen bg-background pb-28 text-foreground">
    <Nav mode="profile" />
    <main
      id="main-content"
      class="mx-auto max-w-7xl px-4 py-10 md:px-6 lg:py-14"
    >
      <div v-if="loading" class="mt-16 text-center">
        <p class="font-serif italic text-muted-foreground">
          Loading profile...
        </p>
      </div>

      <template v-else-if="profile">
        <section>
          <ProfileInfo
            :user="profile.user"
            :following="profile.follow?.following ?? null"
            :follower-count="profile.follow?.followerCount ?? 0"
            @follow="onFollow"
          />
        </section>

        <section
          v-if="profile.categoryStats.length > 0"
          class="mt-14 pt-10"
        >
          <StatsRadar :categories="profile.categoryStats" />
        </section>

        <section v-else class="mt-14 border-t border-border pt-10 text-center">
          <BookOpen class="mx-auto size-10 text-muted-foreground" />
          <h2 class="mt-4 font-serif text-xl">No activity yet</h2>
          <p class="mt-2 text-sm text-muted-foreground">
            This user hasn't borrowed or purchased any books yet.
          </p>
        </section>
      </template>

      <div v-else class="mt-16 text-center">
        <BookOpen class="mx-auto size-10 text-muted-foreground" />
        <h2 class="mt-4 font-serif text-2xl">User not found</h2>
        <p class="mt-2 text-sm text-muted-foreground">
          This profile does not exist or has been removed.
        </p>
      </div>
    </main>
  </div>
</template>
