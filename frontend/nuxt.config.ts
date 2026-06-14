import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: true,
  devtools: { enabled: true },
  css: ["~/assets/css/main.css"],
  modules: [
    "@pinia/nuxt",
    "shadcn-nuxt",
    "@stefanobartoletti/nuxt-social-share",
  ],
  socialShare: {
    baseUrl: process.env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
  },
  devServer: {
    port: 3000,
  },
  runtimeConfig: {
    public: {
      backendUrl: "http://localhost:4000",
    },
  },
  compatibilityDate: "2026-06-03",
  experimental: {
    appManifest: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
