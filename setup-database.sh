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

# Set up pg_isready with the same logic
PG_ISREADY="${PSQL%/*}/pg_isready"
if [ ! -f "$PG_ISREADY" ]; then
    PG_ISREADY="pg_isready"  # Fallback to system PATH
fi

echo "Using pg_isready at: ${PG_ISREADY}"

# Database configuration
DB_NAME="deepagents"
DB_USER="deepagents_user"
DB_PASSWORD="deepagents_password"
DB_HOST="localhost"
DB_PORT="5432"

# Check if PostgreSQL is running, start it if not
echo "Checking PostgreSQL service..."

if ! $PG_ISREADY -h localhost -p 5432 > /dev/null 2>&1; then
    echo "PostgreSQL is not running. Starting it..."
    brew services start postgresql@15
    echo "Waiting for PostgreSQL to start..."
    
    # Wait up to 30 seconds for PostgreSQL to start
    for i in {1..30}; do
        if $PG_ISREADY -h localhost -p 5432 > /dev/null 2>&1; then
            echo "PostgreSQL started successfully."
            break
        fi
        echo "Waiting... ($i/30)"
        sleep 1
    done
    
    # Final check
    if ! $PG_ISREADY -h localhost -p 5432 > /dev/null 2>&1; then
        echo "Failed to start PostgreSQL after 30 seconds."
        echo "Please check if PostgreSQL is running manually:"
        echo "  brew services list | grep postgresql"
        echo "If it shows as 'started', wait a few more seconds and try again."
        exit 1
    fi
else
    echo "PostgreSQL is already running."
fi

# Create database and user
echo "Creating database and user..."

# Create user
echo "Creating user ${DB_USER}..."
${PSQL} -U $USER -d postgres -c "
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_user WHERE usename = '${DB_USER}') THEN
      CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';
      RAISE NOTICE 'User ${DB_USER} created';
   ELSE
      RAISE NOTICE 'User ${DB_USER} already exists';
   END IF;
END
\$\$;" 2>/dev/null || echo "User creation: OK (may already exist)"

# Create database
echo "Creating database ${DB_NAME}..."
${PSQL} -U $USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '${DB_NAME}';" | grep -q 1 || {
    ${PSQL} -U $USER -d postgres -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || echo "Database creation: OK (may already exist)"
}

# Grant privileges
echo "Granting privileges..."
${PSQL} -U $USER -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || echo "Privileges: OK"

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