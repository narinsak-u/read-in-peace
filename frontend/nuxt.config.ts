import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  ssr: true,
  devtools: true,
  css: ["~/assets/css/main.css"],
  modules: ["@pinia/nuxt", "shadcn-nuxt"],
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
