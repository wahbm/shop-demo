import { serve } from '@hono/node-server';
import app, { type Bindings } from './app';
import { MysqlDatabase } from './mysql';
import { migrateMysql } from './mysql-migrations';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const port = Number(process.env.PORT || 8788);
const database = new MysqlDatabase(databaseUrl);
await migrateMysql(database.pool);
const bindings: Bindings = { DB: database };

serve({
  fetch: (request) => app.fetch(request, bindings),
  hostname: '127.0.0.1',
  port,
});
