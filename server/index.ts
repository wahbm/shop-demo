import { serve } from '@hono/node-server';
import app, { type Bindings } from '../worker/index';
import { MysqlD1Database } from './mysql-d1';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const port = Number(process.env.PORT || 8788);
const database = new MysqlD1Database(databaseUrl);
const bindings = { DB: database } as unknown as Bindings;

serve({
  fetch: (request) => app.fetch(request, bindings),
  hostname: '127.0.0.1',
  port,
});
