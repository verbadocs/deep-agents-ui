import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/deepagents',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export interface IndexedRepo {
  id?: number;
  user_id: string;
  repo_owner: string;
  repo_name: string;
  indexed_at?: Date;
  last_updated?: Date;
  is_active?: boolean;
  metadata?: Record<string, any>;
}

export const db = {
  async query(text: string, params?: any[]) {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      console.log('Executed query', { text, duration, rows: res.rowCount });
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  },

  async getIndexedRepos(userId: string): Promise<IndexedRepo[]> {
    const query = `
      SELECT * FROM indexed_repos 
      WHERE user_id = $1 AND is_active = true 
      ORDER BY last_updated DESC
    `;
    const result = await this.query(query, [userId]);
    return result.rows;
  },

  async addIndexedRepo(repo: IndexedRepo): Promise<IndexedRepo> {
    const query = `
      INSERT INTO indexed_repos (user_id, repo_owner, repo_name, metadata)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, repo_owner, repo_name) 
      DO UPDATE SET 
        last_updated = CURRENT_TIMESTAMP,
        is_active = true,
        metadata = EXCLUDED.metadata
      RETURNING *
    `;
    const result = await this.query(query, [
      repo.user_id,
      repo.repo_owner,
      repo.repo_name,
      repo.metadata || {}
    ]);
    return result.rows[0];
  },

  async removeIndexedRepo(userId: string, repoOwner: string, repoName: string): Promise<void> {
    const query = `
      UPDATE indexed_repos 
      SET is_active = false 
      WHERE user_id = $1 AND repo_owner = $2 AND repo_name = $3
    `;
    await this.query(query, [userId, repoOwner, repoName]);
  },

  async initializeDatabase() {
    try {
      const schemaQuery = `
        CREATE TABLE IF NOT EXISTS indexed_repos (
          id SERIAL PRIMARY KEY,
          user_id VARCHAR(255) NOT NULL,
          repo_owner VARCHAR(255) NOT NULL,
          repo_name VARCHAR(255) NOT NULL,
          indexed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          is_active BOOLEAN DEFAULT true,
          metadata JSONB DEFAULT '{}',
          UNIQUE(user_id, repo_owner, repo_name)
        );

        CREATE INDEX IF NOT EXISTS idx_indexed_repos_user_id ON indexed_repos(user_id);
        CREATE INDEX IF NOT EXISTS idx_indexed_repos_owner_name ON indexed_repos(repo_owner, repo_name);
        CREATE INDEX IF NOT EXISTS idx_indexed_repos_active ON indexed_repos(is_active) WHERE is_active = true;
      `;
      await this.query(schemaQuery);
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize database:', error);
    }
  }
};

// Initialize database on module load
if (process.env.NODE_ENV !== 'test') {
  db.initializeDatabase().catch(console.error);
}