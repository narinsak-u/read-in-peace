import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const resolver = fileURLToPath(new URL('../scripts/dev-ca.sh', import.meta.url));

test('development CA resolver defaults to Central Identity export and honors explicit override', (t) => {
  const workspace = mkdtempSync(join(tmpdir(), 'reading-dev-ca-'));
  t.after(() => rmSync(workspace, { recursive: true, force: true }));
  const reading = join(workspace, 'read-in-peace');
  const central = join(workspace, 'book-auth-middleware');
  mkdirSync(join(reading, 'scripts'), { recursive: true });
  mkdirSync(central);
  const localResolver = join(reading, 'scripts/dev-ca.sh');
  writeFileSync(localResolver, `#!/bin/sh\nexec sh '${resolver}'\n`);
  chmodSync(localResolver, 0o755);
  const defaultCertificate = join(central, 'central-identity-root.crt');
  writeFileSync(defaultCertificate, 'public development CA');

  const defaultResult = spawnSync(localResolver, [], { cwd: reading, encoding: 'utf8' });
  assert.equal(defaultResult.status, 0, defaultResult.stderr);
  assert.equal(defaultResult.stdout.trim(), defaultCertificate);

  const overrideCertificate = join(workspace, 'override CA.crt');
  writeFileSync(overrideCertificate, 'explicit public CA');
  const overrideResult = spawnSync(localResolver, [], {
    cwd: reading,
    encoding: 'utf8',
    env: { ...process.env, NODE_EXTRA_CA_CERTS: overrideCertificate },
  });
  assert.equal(overrideResult.status, 0, overrideResult.stderr);
  assert.equal(overrideResult.stdout.trim(), overrideCertificate);

  rmSync(defaultCertificate);
  const missingResult = spawnSync(localResolver, [], { cwd: reading, encoding: 'utf8' });
  assert.notEqual(missingResult.status, 0);
  assert.match(missingResult.stderr, /bun run dev:setup/);
});
