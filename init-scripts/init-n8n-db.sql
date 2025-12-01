-- Create additional databases for ember-feed
-- This script runs on postgres container startup

-- Create the n8n database if it doesn't exist
SELECT 'CREATE DATABASE n8n'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'n8n')\gexec

-- Grant all privileges to the ember user
GRANT ALL PRIVILEGES ON DATABASE n8n TO ember;

-- Create the test database for Playwright E2E tests
-- This database is isolated from production data and reset before each test run
SELECT 'CREATE DATABASE ember_feed_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ember_feed_test')\gexec

-- Grant all privileges to the ember user
GRANT ALL PRIVILEGES ON DATABASE ember_feed_test TO ember;
