import { execFileSync } from 'node:child_process';
import { readdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
rmSync(join(root, '.wrangler'), { recursive: true, force: true });
for (const migration of readdirSync(join(root, 'migrations')).filter((file) => file.endsWith('.sql')).sort()) {
  execFileSync('pnpm', ['exec', 'wrangler', 'd1', 'execute', 'stable-shop-demo', '--local', '--file', join('migrations', migration)], { cwd: root, stdio: 'inherit' });
}
console.log('Local D1 reset: 1 customer, 1 administrator, 24 products, 1 address, 1 order.');
