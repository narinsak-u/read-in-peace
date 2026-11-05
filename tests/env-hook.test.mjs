import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
const { keypair } = createRequire(import.meta.url)('@dotenvx/primitives');
const root = fileURLToPath(new URL('../', import.meta.url));

function run(cwd, ...args) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, GIT_AUTHOR_NAME: 'Env Hook Test', GIT_AUTHOR_EMAIL: 'env-hook@example.test', GIT_COMMITTER_NAME: 'Env Hook Test', GIT_COMMITTER_EMAIL: 'env-hook@example.test' },
  });
  return { code: result.status, stderr: result.stderr, stdout: result.stdout };
}

test('the repository hook encrypts env files and rejects partial staging and private keys', (t) => {
  const repo = mkdtempSync(join(tmpdir(), 'reading-env-hook-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  mkdirSync(join(repo, '.husky'));
  mkdirSync(join(repo, 'frontend'));
  mkdirSync(join(repo, 'backend'));
  copyFileSync(join(root, '.husky/pre-commit'), join(repo, '.husky/pre-commit'));
  chmodSync(join(repo, '.husky/pre-commit'), 0o755);
  symlinkSync(join(root, 'node_modules'), join(repo, 'node_modules'), 'dir');
  assert.equal(run(repo, 'git', 'init', '-q').code, 0);
  assert.equal(run(repo, 'git', 'config', 'core.hooksPath', '.husky').code, 0);
  for (const directory of ['frontend', 'backend']) {
    const { privateKey } = keypair();
    writeFileSync(join(repo, directory, '.env.keys'), `DOTENV_PRIVATE_KEY_DEVELOPMENT="${privateKey}"\n`);
  }
  writeFileSync(join(repo, 'frontend/.env.development'), 'FRONTEND_PUBLIC_URL=https://reading.example.test\n');
  writeFileSync(join(repo, 'backend/.env.development'), 'BACKEND_SECRET=secret-smoke-value\n');
  assert.equal(run(repo, 'git', 'add', 'frontend/.env.development', 'backend/.env.development').code, 0);
  const initialCommit = run(repo, 'git', 'commit', '-m', 'encrypt local environment');
  assert.equal(initialCommit.code, 0, initialCommit.stderr);
  const frontendStaged = run(repo, 'git', 'show', 'HEAD:frontend/.env.development').stdout;
  const backendStaged = run(repo, 'git', 'show', 'HEAD:backend/.env.development').stdout;
  assert.match(frontendStaged, /encrypted:/);
  assert.match(backendStaged, /encrypted:/);
  assert.doesNotMatch(frontendStaged, /reading\.example\.test/);
  assert.doesNotMatch(frontendStaged, /secret-smoke-value/);
  assert.doesNotMatch(backendStaged, /secret-smoke-value/);
  writeFileSync(join(repo, 'frontend/.env.development'), `${frontendStaged}STAGED_CHANGE=1\n`);
  assert.equal(run(repo, 'git', 'add', 'frontend/.env.development').code, 0);
  writeFileSync(join(repo, 'frontend/.env.development'), `${frontendStaged}UNSTAGED_CHANGE=1\n`);
  const partialCommit = run(repo, 'git', 'commit', '-m', 'reject partial env staging');
  assert.notEqual(partialCommit.code, 0);
  assert.match(partialCommit.stderr, /partially staged/);
  assert.equal(run(repo, 'git', 'reset', '--', 'frontend/.env.development').code, 0);
  assert.equal(run(repo, 'git', 'checkout', '--', 'frontend/.env.development').code, 0);

  assert.equal(run(repo, 'git', 'add', '-f', 'frontend/.env.keys').code, 0);
  const keyCommit = run(repo, 'git', 'commit', '-m', 'reject private key');
  assert.notEqual(keyCommit.code, 0);
  assert.match(keyCommit.stderr, /Refusing to commit dotenvx private keys/);
  assert.equal(run(repo, 'git', 'reset', '--', 'frontend/.env.keys').code, 0);
  rmSync(join(repo, 'node_modules'), { recursive: true, force: true });
  mkdirSync(join(repo, 'node_modules/.bin'), { recursive: true });
  writeFileSync(join(repo, 'node_modules/.bin/dotenvx'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(repo, 'node_modules/.bin/dotenvx'), 0o755);
  writeFileSync(join(repo, 'frontend/.env.development'), 'PLAINTEXT=must-not-commit\n');
  assert.equal(run(repo, 'git', 'add', 'frontend/.env.development').code, 0);
  const plaintextCommit = run(repo, 'git', 'commit', '-m', 'reject plaintext env');
  assert.notEqual(plaintextCommit.code, 0);
  assert.match(plaintextCommit.stderr, /Refusing plaintext values in staged environment file/);
});
