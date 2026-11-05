import tailwindcss from "@tailwindcss/vite";

const siteUrl =
  process.env.NUXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:3000");
const backendUrl =
  process.env.NUXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production" ? undefined : "http://localhost:4000");
const centralIdentityUrl =
  process.env.NUXT_PUBLIC_CENTRAL_IDENTITY_URL ||
  (process.env.NODE_ENV === "production" ? undefined : "");

if (
  process.env.NODE_ENV === "production" &&
  (!siteUrl || !backendUrl || !centralIdentityUrl)
) {
  throw new Error("Production frontend URLs must be provided by the operator.");
}

export default defineNuxtConfig({
  ssr: true,
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  modules: [
    "@pinia/nuxt",
    "@nuxt/eslint",
    "shadcn-nuxt",
    "@stefanobartoletti/nuxt-social-share",
  ],
  components: [
    {
      path: "~/components",
      pathPrefix: false,
    },
  ],
  socialShare: {
    baseUrl: siteUrl,
  },
  devServer: {
    port: 3000,
  },
  runtimeConfig: {
    public: {
      siteUrl,
      backendUrl,
      centralIdentityUrl,
    },
  },
  compatibilityDate: "2026-06-03",
  experimental: {
    appManifest: false,
  },
  vite: {
    plugins: [tailwindcss()],
    server: { allowedHosts: ['reading.lvh.me'] },
  },
  app: {
    head: {
      link: [
        { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono&family=Lora:wght@400;500;600&family=Satisfy&display=swap",
          rel: "stylesheet",
        },
      ],
    },
  },
});
