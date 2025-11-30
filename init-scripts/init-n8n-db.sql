-- Create n8n database for workflow automation
-- This script runs on postgres container startup

-- Create the n8n database if it doesn't exist
SELECT 'CREATE DATABASE n8n'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Grant all privileges to the ember user
GRANT ALL PRIVILEGES ON DATABASE n8n TO ember;
