import type { Pool, RowDataPacket } from 'mysql2/promise';

type MysqlQueryExecutor = Pick<Pool, 'query'>;

type ProductColumn = { name: string; definition: string };

const productColumns: ProductColumn[] = [
  { name: 'cover_bucket_id', definition: 'VARCHAR(128) NULL' },
  { name: 'cover_path', definition: 'VARCHAR(512) NULL' },
  { name: 'cover_original_name', definition: 'VARCHAR(255) NULL' },
  { name: 'cover_mime_type', definition: 'VARCHAR(128) NULL' },
  { name: 'cover_size_bytes', definition: 'BIGINT NULL' },
  { name: 'cover_visibility', definition: "VARCHAR(16) NOT NULL DEFAULT 'public'" },
];

export async function migrateMysql(pool: MysqlQueryExecutor) {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'",
  );
  const existingColumns = new Set(rows.map((row) => String(row.name)));
  let added = 0;
  for (const column of productColumns) {
    if (existingColumns.has(column.name)) continue;
    await pool.query(`ALTER TABLE products ADD COLUMN ${column.name} ${column.definition}`);
    existingColumns.add(column.name);
    added += 1;
    console.log(`Added products.${column.name}`);
  }
  console.log(added ? `MariaDB migration complete: ${added} column(s) added.` : 'MariaDB migration already up to date.');
}
