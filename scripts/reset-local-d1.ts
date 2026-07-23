import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
rmSync(join(root, '.wrangler'), { recursive: true, force: true });
execFileSync('pnpm', ['exec', 'wrangler', 'd1', 'execute', 'stable-shop-demo', '--local', '--file=migrations/0001_init.sql'], { cwd: root, stdio: 'inherit' });
console.log('Local D1 reset: 1 user, 24 products, 1 address, 1 order.');
