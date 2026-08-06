import mysql, { type ExecuteValues, type Pool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

type Executor = Pool | PoolConnection;
type D1Result = { meta: { changes: number; last_row_id: number } };

function normalize(values: unknown[]): ExecuteValues[] {
  return values.map((value) => value === undefined ? null : value as ExecuteValues);
}

export class MysqlStatement {
  private values: ExecuteValues[] = [];

  constructor(private readonly database: MysqlD1Database, private readonly query: string) {}

  bind(...values: unknown[]) {
    this.values = normalize(values);
    return this;
  }

  async first<T>(executor: Executor = this.database.pool): Promise<T | null> {
    const [rows] = await executor.execute<RowDataPacket[]>(this.query, this.values);
    return (rows[0] as T | undefined) ?? null;
  }

  async all<T>(executor: Executor = this.database.pool): Promise<{ results: T[] }> {
    const [rows] = await executor.execute<RowDataPacket[]>(this.query, this.values);
    return { results: rows as T[] };
  }

  async run(executor: Executor = this.database.pool): Promise<D1Result> {
    const [result] = await executor.execute<ResultSetHeader>(this.query, this.values);
    return { meta: { changes: result.affectedRows, last_row_id: Number(result.insertId) } };
  }
}

export class MysqlD1Database {
  readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = mysql.createPool({ uri: databaseUrl, connectionLimit: 8, enableKeepAlive: true, charset: 'utf8mb4', decimalNumbers: true });
  }

  prepare(query: string) {
    return new MysqlStatement(this, query);
  }

  async batch(statements: MysqlStatement[]) {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const results = [];
      for (const statement of statements) results.push(await statement.run(connection));
      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}
