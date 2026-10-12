import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawn, type ChildProcess } from 'node:child_process';
import mysql from 'mysql2/promise';

// Never fall back to DATABASE_URL: it may point at the persistent ECS database.
const testServerUrl = process.env.TEST_DATABASE_URL;
if (!testServerUrl) throw new Error('TEST_DATABASE_URL is required; use a test MariaDB account with CREATE/DROP DATABASE privileges. DATABASE_URL is never used for tests.');
const serverUrl = new URL(testServerUrl);
if (!['mysql:', 'mariadb:'].includes(serverUrl.protocol)) throw new Error('TEST_DATABASE_URL must be a MariaDB/MySQL URL');
// The supplied database path is deliberately ignored. Only our random schema is modified.
serverUrl.pathname = '/';
serverUrl.search = '';
const schema = `shop_demo_test_${randomBytes(12).toString('hex')}`;
const databaseUrl = new URL(serverUrl);
databaseUrl.pathname = `/${schema}`;
const connection = await mysql.createConnection({ uri: serverUrl.toString(), charset: 'utf8mb4', multipleStatements: true });
let created = false;
let child: ChildProcess | undefined;
let interrupted = false;
const interrupt = () => { interrupted = true; child?.kill('SIGTERM'); };
process.on('SIGINT', interrupt);
process.on('SIGTERM', interrupt);
try {
  await connection.query(`CREATE DATABASE \`${schema}\` CHARACTER SET utf8mb4`);
  created = true;
  await connection.query(`USE \`${schema}\``);
  await connection.query(await readFile(new URL('../server/schema.mysql.sql', import.meta.url), 'utf8'));
  console.log(`Playwright isolated database: ${schema}`);
  if (interrupted) throw new Error('Test setup interrupted');
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  child = spawn(process.execPath, [cli, 'test', ...process.argv.slice(2)], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl.toString(), SHOP_TEST_DATABASE: schema, PORT: '18788', VITE_API_PROXY_TARGET: 'http://127.0.0.1:18788' },
  });
  const testProcess = child;
  process.exitCode = await new Promise<number>((resolve, reject) => {
    testProcess.once('error', reject);
    testProcess.once('close', (code) => resolve(interrupted ? 1 : code ?? 1));
  });
} finally {
  try {
    if (created) {
      await connection.query(`DROP DATABASE \`${schema}\``);
      console.log(`Removed isolated database: ${schema}`);
    }
  } finally {
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
    await connection.end();
  }
}
