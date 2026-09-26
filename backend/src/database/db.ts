import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { config } from '../config';

interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>>;
  exec(sql: string): Promise<void>;
  transaction<T>(fn: (tx: { query<R = any>(text: string, params?: any[]): Promise<QueryResult<R>> }) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

class DatabaseManager implements DbClient {
  private pgPool: Pool | null = null;
  private pgliteInstance: PGlite | null = null;
  private initialized = false;

  private async getClient(): Promise<{ type: 'pg' | 'pglite'; instance: Pool | PGlite }> {
    if (!this.initialized) {
      if (config.databaseUrl) {
        this.pgPool = new Pool({
          connectionString: config.databaseUrl,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
        });
        this.initialized = true;
        console.log('[Database] Connected to external PostgreSQL via DATABASE_URL');
        return { type: 'pg', instance: this.pgPool };
      } else {
        // Ensure data directory exists for embedded PostgreSQL
        if (!fs.existsSync(config.dbDataDir)) {
          fs.mkdirSync(config.dbDataDir, { recursive: true });
        }
        this.pgliteInstance = new PGlite(config.dbDataDir);
        await this.pgliteInstance.waitReady;
        this.initialized = true;
        console.log(`[Database] Using persistent embedded PostgreSQL at: ${config.dbDataDir}`);
        return { type: 'pglite', instance: this.pgliteInstance };
      }
    }

    if (this.pgPool) {
      return { type: 'pg', instance: this.pgPool };
    } else {
      return { type: 'pglite', instance: this.pgliteInstance! };
    }
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    const client = await this.getClient();
    if (client.type === 'pg') {
      const res = await (client.instance as Pool).query(text, params);
      return {
        rows: res.rows,
        rowCount: res.rowCount ?? res.rows.length,
      };
    } else {
      const res = await (client.instance as PGlite).query(text, params);
      const rowCount = res.rows && res.rows.length > 0 ? res.rows.length : (res.affectedRows ?? 0);
      return {
        rows: res.rows as T[],
        rowCount,
      };
    }
  }

  async exec(sql: string): Promise<void> {
    const client = await this.getClient();
    if (client.type === 'pg') {
      await (client.instance as Pool).query(sql);
    } else {
      await (client.instance as PGlite).exec(sql);
    }
  }

  async transaction<T>(
    fn: (tx: { query<R = any>(text: string, params?: any[]): Promise<QueryResult<R>> }) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    if (client.type === 'pg') {
      const pgClient = await (client.instance as Pool).connect();
      try {
        await pgClient.query('BEGIN');
        const txWrapper = {
          query: async <R = any>(text: string, params?: any[]): Promise<QueryResult<R>> => {
            const res = await pgClient.query(text, params);
            return {
              rows: res.rows,
              rowCount: res.rowCount ?? res.rows.length,
            };
          },
        };
        const result = await fn(txWrapper);
        await pgClient.query('COMMIT');
        return result;
      } catch (err) {
        await pgClient.query('ROLLBACK');
        throw err;
      } finally {
        pgClient.release();
      }
    } else {
      const pglite = client.instance as PGlite;
      return await pglite.transaction(async (tx) => {
        const txWrapper = {
          query: async <R = any>(text: string, params?: any[]): Promise<QueryResult<R>> => {
            const res = await tx.query(text, params);
            const rowCount = res.rows && res.rows.length > 0 ? res.rows.length : (res.affectedRows ?? 0);
            return {
              rows: res.rows as R[],
              rowCount,
            };
          },
        };
        return await fn(txWrapper);
      });
    }
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
    }
    if (this.pgliteInstance) {
      await this.pgliteInstance.close();
    }
    this.initialized = false;
  }
}

export const db = new DatabaseManager();
