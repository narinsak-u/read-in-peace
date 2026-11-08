import tailwindcss from "@tailwindcss/vite";

const testProduction = process.env.TEST_PRODUCTION === "true";
const siteUrl =
  process.env.NUXT_PUBLIC_SITE_URL ||
  (process.env.NODE_ENV === "production" && !testProduction
    ? undefined
    : "http://localhost:3001");
const backendUrl =
  process.env.NUXT_PUBLIC_BACKEND_URL ||
  (process.env.NODE_ENV === "production" && !testProduction
    ? undefined
    : "http://localhost:3000");

if (
  process.env.NODE_ENV === "production" &&
  !testProduction &&
  (!siteUrl || !backendUrl)
) {
  throw new Error("Production frontend URLs must be provided by the operator.");
}

if (
  testProduction &&
  (siteUrl !== "https://reading-test.localhost:8081" ||
    backendUrl !== "http://localhost:3100")
) {
  throw new Error("Test-production frontend origins must use the isolated local HTTPS gateway.");
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
    host: "127.0.0.1",
    port: Number(process.env.NUXT_PORT || 3001),
  },
  runtimeConfig: {
    public: {
      siteUrl,
      backendUrl,
    },
  },
  compatibilityDate: "2026-06-03",
  experimental: {
    appManifest: false,
  },
  vite: {
    plugins: [tailwindcss()],
    server: { allowedHosts: ["localhost", "reading.localhost", "reading-test.localhost"] },
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
