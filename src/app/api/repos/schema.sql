-- Create indexed_repos table to track user-indexed repositories
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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_indexed_repos_user_id ON indexed_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_indexed_repos_owner_name ON indexed_repos(repo_owner, repo_name);
CREATE INDEX IF NOT EXISTS idx_indexed_repos_active ON indexed_repos(is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_indexed_repos_updated_at BEFORE UPDATE
    ON indexed_repos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();