#!/bin/bash

# PostgreSQL Database Setup Script for Deep Agents

echo "Setting up PostgreSQL database for Deep Agents..."

# Check if PostgreSQL is installed and find the psql path
if ! command -v psql &> /dev/null; then
    # Try to find psql in common locations
    if [ -f "/opt/homebrew/opt/postgresql@15/bin/psql" ]; then
        PSQL="/opt/homebrew/opt/postgresql@15/bin/psql"
    elif [ -f "/usr/local/opt/postgresql@15/bin/psql" ]; then
        PSQL="/usr/local/opt/postgresql@15/bin/psql"
    else
        echo "PostgreSQL is not installed. Please install it first:"
        echo "  brew install postgresql@15"
        exit 1
    fi
else
    PSQL="psql"
fi

echo "Using PostgreSQL at: ${PSQL}"

# Database configuration
DB_NAME="deepagents"
DB_USER="deepagents_user"
DB_PASSWORD="deepagents_password"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is running, start it if not
echo "Checking PostgreSQL service..."
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo "PostgreSQL is not running. Starting it..."
    brew services start postgresql@15
    sleep 3  # Give it a moment to start
    
    # Check again
    if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
        echo "Failed to start PostgreSQL. Please start it manually:"
        echo "  brew services start postgresql@15"
        exit 1
    fi
fi
echo "PostgreSQL is running."

# Create database and user
echo "Creating database and user..."
${PSQL} -U $USER -d postgres <<EOF 2>/dev/null
-- Create user if not exists
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
      CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
      RAISE NOTICE 'User ${DB_USER} created';
   ELSE
      RAISE NOTICE 'User ${DB_USER} already exists';
   END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE ${DB_NAME} OWNER ${DB_USER}' 
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${DB_NAME}')\gexec

-- Grant all privileges
GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};
EOF

if [ $? -ne 0 ]; then
    echo "Note: Database and user may already exist (this is okay)."
fi

# Create the tables
echo "Creating database tables..."
SCHEMA_FILE="$(dirname "$0")/src/app/api/repos/schema.sql"
if [ -f "$SCHEMA_FILE" ]; then
    PGPASSWORD=${DB_PASSWORD} ${PSQL} -U ${DB_USER} -d ${DB_NAME} -h ${DB_HOST} -f "$SCHEMA_FILE" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Database tables created successfully."
    else
        echo "Note: Tables may already exist (this is okay)."
    fi
else
    echo "Warning: Schema file not found at $SCHEMA_FILE"
    echo "Creating tables inline..."
    PGPASSWORD=${DB_PASSWORD} ${PSQL} -U ${DB_USER} -d ${DB_NAME} -h ${DB_HOST} <<EOF 2>/dev/null
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

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_indexed_repos_user_id ON indexed_repos(user_id);
CREATE INDEX IF NOT EXISTS idx_indexed_repos_owner_name ON indexed_repos(repo_owner, repo_name);
CREATE INDEX IF NOT EXISTS idx_indexed_repos_active ON indexed_repos(is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS \$\$
BEGIN
    NEW.last_updated = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
\$\$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_indexed_repos_updated_at ON indexed_repos;
CREATE TRIGGER update_indexed_repos_updated_at BEFORE UPDATE
    ON indexed_repos FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EOF
fi

# Handle .env.local file
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

if [ -f .env.local ]; then
    # Check if DATABASE_URL already exists
    if grep -q "^DATABASE_URL=" .env.local; then
        echo "Updating existing DATABASE_URL in .env.local..."
        # Use a different sed syntax for macOS
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env.local
        else
            sed -i "s|^DATABASE_URL=.*|DATABASE_URL=${DATABASE_URL}|" .env.local
        fi
    else
        echo "Appending DATABASE_URL to existing .env.local..."
        echo "" >> .env.local
        echo "# Database Configuration" >> .env.local
        echo "DATABASE_URL=${DATABASE_URL}" >> .env.local
    fi
else
    echo "Creating new .env.local file..."
    cat > .env.local <<EOF
# Database Configuration
DATABASE_URL=${DATABASE_URL}
EOF
fi

# Test the connection
echo "Testing database connection..."
PGPASSWORD=${DB_PASSWORD} ${PSQL} -U ${DB_USER} -d ${DB_NAME} -h ${DB_HOST} -c "SELECT 1;" > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Database connection successful!"
else
    echo "⚠️  Warning: Could not connect to database. Please check the settings."
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Database Details:"
echo "  Name: ${DB_NAME}"
echo "  User: ${DB_USER}"
echo "  Password: ${DB_PASSWORD}"
echo "  Host: ${DB_HOST}"
echo "  Port: ${DB_PORT}"
echo ""
echo "Connection string has been saved to .env.local"
echo "DATABASE_URL=${DATABASE_URL}"
echo ""
echo "⚠️  IMPORTANT: Restart your Next.js server for changes to take effect:"
echo "  1. Stop the server (Ctrl+C)"
echo "  2. Run: npm run dev"
echo ""
echo "To test the connection manually, run:"
echo "  PGPASSWORD=${DB_PASSWORD} ${PSQL} -U ${DB_USER} -d ${DB_NAME} -h ${DB_HOST}"