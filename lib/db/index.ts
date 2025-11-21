// Database connection and utilities
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'dashboard.db');
const SCHEMA_PATH = path.join(process.cwd(), 'lib', 'db', 'schema.sql');

let db: Database.Database | null = null;

/**
 * Get database connection (singleton)
 */
export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL'); // Better concurrency
    initializeSchema();
  }
  return db;
}

/**
 * Initialize database schema
 */
function initializeSchema() {
  if (!db) return;

  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);
  console.log('✅ Database schema initialized');
}

/**
 * Close database connection
 */
export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}

// Export database instance
export default getDb;
