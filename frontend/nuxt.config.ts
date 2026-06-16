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
  app: {
    head: {
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono&family=Lora:wght@400;500;600&display=swap', rel: 'stylesheet' },
      ],
    },
  },
});
