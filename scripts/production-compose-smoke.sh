#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
project="reading-smoke-$(date +%s)-$$-${RANDOM}"
volume="${project}-db"
tmpdir=$(mktemp -d)
volume_created=0
compose=(docker compose --project-name "$project" --env-file "$tmpdir/env" -f "$root/compose.production.yaml")

cleanup() {
  "${compose[@]}" down --remove-orphans >/dev/null 2>&1 || true
  if [[ "$volume_created" == 1 ]]; then
    docker volume rm "$volume" >/dev/null
  fi
  rm -rf "$tmpdir"
}
trap cleanup EXIT

if [[ -n "${READING_DB_VOLUME:-}" ]]; then
  echo 'Refusing to use operator Reading volume; this rehearsal creates its own disposable volume.' >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo 'Docker daemon is not available.' >&2
  exit 1
fi

read -r frontend_port backend_port < <(node -e 'const net=require("node:net");const servers=[net.createServer(),net.createServer()];let ready=0;for(const server of servers)server.listen(0,"127.0.0.1",()=>{if(++ready===servers.length){console.log(servers.map(s=>s.address().port).join(" "));servers.forEach(s=>s.close())}})')
identity=${CENTRAL_IDENTITY_ISSUER:?Set CENTRAL_IDENTITY_ISSUER to the public identity issuer for sign-in verification}
identity_origin=$(node -e 'console.log(new URL(process.argv[1]).origin)' "$identity")
frontend_url="http://127.0.0.1:$frontend_port"
cat >"$tmpdir/env" <<EOF
COMPOSE_PROJECT_NAME=$project
READING_DB_VOLUME=$volume
READING_POSTGRES_DB=reading
READING_POSTGRES_USER=reading
READING_POSTGRES_PASSWORD=synthetic-reading-database-password
READING_DATABASE_URL=postgres://reading:synthetic-reading-database-password@db:5432/reading
READING_AUTH_SECRET=synthetic-reading-auth-secret-at-least-32-characters
READING_STRIPE_SECRET_KEY=synthetic-stripe-secret
READING_STRIPE_WEBHOOK_SECRET=synthetic-webhook-secret
READING_FRONTEND_URL=$frontend_url
READING_BACKEND_URL=http://127.0.0.1:$backend_port
READING_FRONTEND_PORT=$frontend_port
READING_BACKEND_PORT=$backend_port
CENTRAL_IDENTITY_ISSUER=$identity
NUXT_PUBLIC_CENTRAL_IDENTITY_URL=$identity_origin
CENTRAL_IDENTITY_CLIENT_ID=synthetic-reading-client
CENTRAL_IDENTITY_CLIENT_SECRET=synthetic-reading-client-secret
EOF

if [[ -n "${CENTRAL_IDENTITY_SMOKE_CA_CERT:-}" ]]; then
  if [[ ! -f "$CENTRAL_IDENTITY_SMOKE_CA_CERT" ]]; then
    echo 'CENTRAL_IDENTITY_SMOKE_CA_CERT must name a CA certificate file.' >&2
    exit 1
  fi
  CENTRAL_IDENTITY_ISSUER="$identity" CENTRAL_IDENTITY_SMOKE_CA_CERT="$CENTRAL_IDENTITY_SMOKE_CA_CERT" node -e '
const path=require("node:path");
const hostname=new URL(process.env.CENTRAL_IDENTITY_ISSUER).hostname;
const cert="/run/smoke/central-identity-ca.pem";
process.stdout.write(JSON.stringify({services:{backend:{
  extra_hosts:[`${hostname}:host-gateway`],
  environment:{NODE_EXTRA_CA_CERTS:cert},
  volumes:[{type:"bind",source:path.resolve(process.env.CENTRAL_IDENTITY_SMOKE_CA_CERT),target:cert,read_only:true}]
}}}));
' >"$tmpdir/compose.smoke.json"
  compose+=(-f "$tmpdir/compose.smoke.json")
fi

# Check required deployment values and public/private boundaries before creating anything.
"${compose[@]}" config --format json | EXPECTED_VOLUME="$volume" EXPECTED_IDENTITY_ORIGIN="$identity_origin" node -e '
let input="";process.stdin.on("data",chunk=>input+=chunk);process.stdin.on("end",()=>{
 const c=JSON.parse(input), services=c.services, dbVolume=services.db.volumes.find(v=>v.target==="/var/lib/postgresql/data"), frontend=services.frontend;
 const ports=Object.values(services).flatMap(s=>s.ports||[]);
 const secretKeys=["DATABASE_URL","AUTH_SECRET","STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","CENTRAL_IDENTITY_CLIENT_SECRET"];
 if(dbVolume?.source!=="reading-db" || dbVolume?.type!=="volume" || !dbVolume?.source || c.volumes?.["reading-db"]?.external!==true || c.volumes?.["reading-db"]?.name!==process.env.EXPECTED_VOLUME || ports.length!==2 || ports.some(p=>p.host_ip!=="127.0.0.1") || secretKeys.some(k=>Object.hasOwn(frontend.environment||{},k)) || frontend.environment?.NUXT_PUBLIC_CENTRAL_IDENTITY_URL!==process.env.EXPECTED_IDENTITY_ORIGIN || frontend.build?.args?.NUXT_PUBLIC_CENTRAL_IDENTITY_URL!==process.env.EXPECTED_IDENTITY_ORIGIN || Object.hasOwn(services,"auth") || Object.hasOwn(services,"reading-backend")) process.exit(1);
});'
docker volume create "$volume" >/dev/null
volume_created=1
"${compose[@]}" build backend frontend
"${compose[@]}" up --detach --wait db
"${compose[@]}" run --rm --no-deps backend npm exec -- drizzle-kit migrate
"${compose[@]}" up --detach --wait

# Persist an isolated marker through a full stack stop/start to prove volume ownership.
marker="${project}-persistent"
"${compose[@]}" exec -T db psql -U reading -d reading -v ON_ERROR_STOP=1 -c 'CREATE TABLE compose_smoke_marker (value text PRIMARY KEY)' -c "INSERT INTO compose_smoke_marker VALUES ('$marker')"
"${compose[@]}" stop
"${compose[@]}" up --detach --wait
stored=$("${compose[@]}" exec -T db psql -U reading -d reading -Atc 'SELECT value FROM compose_smoke_marker')
[[ "$stored" == "$marker" ]]

curl --fail --silent --show-error "$frontend_url/" >/dev/null
curl --fail --silent --show-error "$frontend_url/dashboard" >/dev/null
curl --fail --silent --show-error "http://127.0.0.1:$backend_port/" >/dev/null
issuer_url="${identity%/}/.well-known/openid-configuration"
curl --fail --silent --show-error "$issuer_url" >"$tmpdir/discovery.json"
EXPECTED_ISSUER="$identity" node -e 'const d=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));if(d.issuer!==process.env.EXPECTED_ISSUER||!d.authorization_endpoint)process.exit(1)' "$tmpdir/discovery.json"

# A real backend sign-in request must hand the browser to the configured public issuer.
status=$(curl --silent --show-error --output "$tmpdir/sign-in.json" --write-out '%{http_code}' -X POST "http://127.0.0.1:$backend_port/api/auth/sign-in/social" \
  -H "origin: $frontend_url" \
  -H 'content-type: application/json' \
  --data "{\"provider\":\"central-identity\",\"callbackURL\":\"$frontend_url/\"}")
if [[ "$status" != 2* ]]; then
  code=$(node -e 'try{const e=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));const c=e.code??e.error?.code;console.log(typeof c==="string"&&/^[A-Za-z0-9_.-]+$/.test(c)?c:"unknown")}catch{console.log("unknown")}' "$tmpdir/sign-in.json")
  echo "Reading sign-in failed: HTTP $status, error code $code" >&2
  exit 1
fi
EXPECTED_ISSUER="$identity" node -e '
const body=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));
const redirect=new URL(body.url);
const issuer=new URL(process.env.EXPECTED_ISSUER);
if(redirect.origin!==issuer.origin||!redirect.pathname.startsWith(issuer.pathname.replace(/\/$/,"")+"/oauth2/authorize"))process.exit(1);
' "$tmpdir/sign-in.json"

echo 'Reading production Compose rehearsal passed with a disposable database volume.'
