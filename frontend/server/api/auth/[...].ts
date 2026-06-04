export default defineEventHandler(async (event) => {
  const backendUrl = useRuntimeConfig().public.backendUrl;
  const path = event.path;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const cookie = getHeader(event, 'cookie');
  if (cookie) {
    headers['cookie'] = cookie;
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method: event.method,
    headers,
    body:
      event.method !== 'GET' && event.method !== 'HEAD'
        ? JSON.stringify(await readBody(event))
        : undefined,
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    setHeader(event, 'set-cookie', setCookie);
  }

  return response.json();
});
