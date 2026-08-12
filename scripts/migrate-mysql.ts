import mysql from 'mysql2/promise';
import { migrateMysql } from '../server/mysql-migrations';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to migrate MariaDB');

const connection = await mysql.createConnection({ uri: databaseUrl, charset: 'utf8mb4' });
try {
  await migrateMysql(connection);
} finally {
  await connection.end();
}
