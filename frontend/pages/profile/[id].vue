<script setup lang="ts">
import { BookOpen } from "lucide-vue-next";
import { useProfile } from "~/composables/useProfile";
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

watch(error, (err) => {
  if (err) flash("Could not load profile");
});

watch(userId, () => refresh());
</script>

<template>
  <div class="min-h-screen bg-background pb-28 text-foreground">
    <Nav mode="feed" />
    <main
      id="main-content"
      class="mx-auto max-w-6xl px-4 py-10 md:px-6 lg:py-14"
    >
      <div v-if="loading" class="mt-16 text-center">
        <p class="font-serif italic text-muted-foreground">
          Loading profile...
        </p>
      </div>

      <template v-else-if="profile">
        <!-- Section 1: Avatar + user info -->
        <section>
          <ProfileInfo :user="profile.user" />
        </section>

        <!-- Section 2: Radar chart -->
        <section
          v-if="profile.categoryStats.length > 0"
          class="mt-14 border-t border-border pt-10"
        >
          <!-- <h2
            class="mb-8 text-center font-serif text-xl font-semibold sm:text-left"
          >
            Characteristics
          </h2> -->
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
