import { spawnSync } from 'node:child_process';
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repository = 'https://github.com/puramapro-oss/purama-smarana.git';
// GitHub's published Ed25519 host key, verified on 2026-11-11:
// https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints
const githubKnownHosts = 'github.com ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOMqqnkVzrm0SdG6UOoqKLsabgH5C9okWi0dh2l9GKJl\n';

function cleanEnvironment(original) {
  const env = { ...original };
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_') || key.startsWith('SSH_') || [
      'SMARANA_READ_TOKEN', 'PURAMA_PACKAGES_READ_TOKEN',
      'SMARANA_READ_SSH_KEY', 'PURAMA_PACKAGES_READ_SSH_KEY',
      'GH_TOKEN', 'GITHUB_TOKEN',
    ].includes(key)) delete env[key];
  }
  return env;
}

/** Scoped authorization is available only during dependency acquisition. */
export function installationEnvironment(original, token) {
  if (typeof token !== 'string' || !token.trim() || /[\r\n\0]/.test(token)) {
    throw new Error('SMARANA_READ_TOKEN with read-only access is required.');
  }
  const env = cleanEnvironment(original);
  const values = [
    [`url.${repository}.insteadOf`, 'ssh://git@github.com/puramapro-oss/purama-smarana.git'],
    [`url.${repository}.insteadOf`, 'git@github.com:puramapro-oss/purama-smarana.git'],
    [`http.${repository}.extraHeader`, `Authorization: Basic ${Buffer.from(`x-access-token:${token}`).toString('base64')}`],
    [`http.${repository}.followRedirects`, 'false'],
    ['credential.helper', ''],
  ];
  Object.assign(env, { GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: String(values.length) });
  values.forEach(([key, value], index) => { env[`GIT_CONFIG_KEY_${index}`] = key; env[`GIT_CONFIG_VALUE_${index}`] = value; });
  return env;
}

export function sshInstallationEnvironment(original, keyFile, knownHostsFile) {
  for (const file of [keyFile, knownHostsFile]) {
    if (typeof file !== 'string' || !path.isAbsolute(file) || /[\r\n\0]/.test(file)) {
      throw new Error('An absolute temporary SSH file path is required.');
    }
  }
  // Git runs GIT_SSH_COMMAND through a shell; quote only our owned file paths.
  const quote = value => `'${value.replace(/'/g, `'\\''`)}'`;
  // OpenSSH parses -o values again after the shell has removed its quoting.
  const configQuote = value => `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  return {
    ...cleanEnvironment(original),
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_TERMINAL_PROMPT: '0', GIT_CONFIG_COUNT: '1',
    GIT_CONFIG_KEY_0: 'credential.helper', GIT_CONFIG_VALUE_0: '',
    GIT_ALLOW_PROTOCOL: 'https:ssh', GIT_SSH_VARIANT: 'ssh',
    GIT_SSH_COMMAND: [
      'ssh -F /dev/null', `-i ${quote(keyFile)}`,
      '-o BatchMode=yes -o IdentitiesOnly=yes -o IdentityAgent=none',
      '-o StrictHostKeyChecking=yes -o HostKeyAlgorithms=ssh-ed25519',
      `-o ${quote(`UserKnownHostsFile=${configQuote(knownHostsFile)}`)} -o GlobalKnownHostsFile=/dev/null`,
      '-o PasswordAuthentication=no -o KbdInteractiveAuthentication=no',
      '-o ClearAllForwardings=yes -o ConnectTimeout=10 -o ConnectionAttempts=1',
    ].join(' '),
  };
}

function runInstallation(env, run) {
  // Lifecycle scripts execute only in the following, credential-free CI step.
  const result = run('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], {
    env, stdio: 'inherit', shell: false,
  });
  if (result.error) throw new Error('Could not start the locked dependency installation.');
  if (result.status !== 0) throw new Error('Locked dependency installation failed; verify private read access.');
}

export function installFromLock({ token, sshKey, env = process.env, run = spawnSync } = {}) {
  if (sshKey === undefined) return runInstallation(installationEnvironment(env, token), run);
  if (token !== undefined) throw new Error('Choose one private read credential transport.');
  if (typeof sshKey !== 'string' || !sshKey.trim() || sshKey.includes('\0') || sshKey.length > 32768) {
    throw new Error('SMARANA_READ_SSH_KEY with read-only access is required.');
  }
  const directory = mkdtempSync(path.join(tmpdir(), 'midas-smarana-ssh-'));
  try {
    chmodSync(directory, 0o700);
    const keyFile = path.join(directory, 'identity');
    const knownHostsFile = path.join(directory, 'known_hosts');
    writeFileSync(keyFile, `${sshKey.trim()}\n`, { mode: 0o600, flag: 'wx' });
    writeFileSync(knownHostsFile, githubKnownHosts, { mode: 0o600, flag: 'wx' });
    return runInstallation(sshInstallationEnvironment(env, keyFile, knownHostsFile), run);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { installFromLock({ token: process.env.SMARANA_READ_TOKEN, sshKey: process.env.SMARANA_READ_SSH_KEY }); }
  catch (error) { process.stderr.write(`${error.message}\n`); process.exitCode = 1; }
}
