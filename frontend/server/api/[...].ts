import { proxyRequest } from 'h3';

export default defineEventHandler(async (event) => {
  const backendUrl = useRuntimeConfig().public.backendUrl;
  const path = event.path;

  await proxyRequest(event, `${backendUrl}${path}`, {
    headers: {
      origin: getHeader(event, 'origin') || 'http://localhost:3000',
    },
  });
});
