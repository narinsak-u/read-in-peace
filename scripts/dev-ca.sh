#!/bin/sh
set -eu

ca=${NODE_EXTRA_CA_CERTS-}
if [ "${NODE_EXTRA_CA_CERTS+x}" != x ]; then
  ca=../book-auth-middleware/central-identity-root.crt
fi

if ! resolved=$(realpath "$ca" 2>/dev/null) || [ ! -f "$resolved" ] || [ ! -r "$resolved" ]; then
  if [ "${NODE_EXTRA_CA_CERTS+x}" = x ]; then
    printf 'NODE_EXTRA_CA_CERTS must name a readable CA certificate: %s\n' "$ca" >&2
  else
    printf 'Central Identity CA certificate not found: %s\nRun bun run dev:setup in ../book-auth-middleware, or set NODE_EXTRA_CA_CERTS to a readable CA certificate.\n' "$ca" >&2
  fi
  exit 1
fi

printf '%s\n' "$resolved"
