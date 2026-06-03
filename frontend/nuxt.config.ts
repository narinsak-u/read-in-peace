export default defineNuxtConfig({
  ssr: true,
  devtools: true,
  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt", "shadcn-nuxt", "@nuxtjs/tailwindcss"],
  devServer: {
    port: 3000,
  },
  runtimeConfig: {
    public: {
      backendUrl: "http://localhost:4000",
    },
  },
  compatibilityDate: "2026-06-03",
});
