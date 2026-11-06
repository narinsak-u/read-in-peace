import { createPinia, setActivePinia } from "pinia";
import { beforeEach, expect, it, vi } from "vitest";
import { readonly, ref } from "vue";

const { useSession, signInSocial, signOut, flash } = vi.hoisted(() => ({
  useSession: vi.fn(),
  signInSocial: vi.fn(),
  signOut: vi.fn(),
  flash: vi.fn(),
}));

vi.mock("~/lib/auth-client", () => ({
  authClient: { useSession, signIn: { social: signInSocial } },
  signOut,
}));
vi.mock("~/composables/useFlash", () => ({ useFlash: () => ({ flash }) }));

import { useAuthStore } from "~/stores/auth";

beforeEach(() => {
  vi.stubGlobal("readonly", readonly);
  vi.stubGlobal("window", { location: { origin: "https://reading.example.test", pathname: "/dashboard", search: "", hash: "" } });
  setActivePinia(createPinia());
  useSession.mockReturnValue(ref({ data: null, isPending: false }));
  signInSocial.mockResolvedValue({ error: { message: "Provider not found" } });
  flash.mockClear();
});

it("reports Central Identity sign-in failures through the flash notice", async () => {
  await useAuthStore().signInCentral();

  expect(flash).toHaveBeenCalledWith("Provider not found");
});
