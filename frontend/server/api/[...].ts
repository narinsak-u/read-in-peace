import { proxyRequest } from 'h3';

export default defineEventHandler(async (event) => {
  const backendUrl = useRuntimeConfig().public.backendUrl;
  const path = event.path;

  try {
    await proxyRequest(event, `${backendUrl}${path}`, {
      headers: {
        origin: getHeader(event, 'origin') || 'http://localhost:3000',
      },
    });
  } catch {
    throw createError({ statusCode: 502, message: 'Backend unavailable' });
  }
});
