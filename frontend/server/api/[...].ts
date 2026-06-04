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

  const origin = getHeader(event, 'origin');
  if (origin) {
    headers['origin'] = origin;
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method: event.method,
    headers,
    body:
      event.method !== 'GET' && event.method !== 'HEAD'
        ? JSON.stringify(await readBody(event))
        : undefined,
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    setHeader(event, 'set-cookie', setCookie);
  }

  return data;
});
