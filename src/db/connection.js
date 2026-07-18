import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(path.join(__dirname, '..', '..', 'data'));
const dbPath = path.join(dataDir, 'database.sqlite');

// Ensure data folder exists
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let dbConnection = null;

/**
 * Returns a connection to the promise-wrapped SQLite database.
 * @returns {Promise<import('sqlite').Database>}
 */
export async function getDb() {
  if (dbConnection) return dbConnection;

  dbConnection = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign key support
  await dbConnection.get('PRAGMA foreign_keys = ON');

  // Database migrations
  await dbConnection.exec('ALTER TABLE bookings ADD COLUMN confirmed_slot TEXT').catch(() => {});
  
  // Safe column migrations for Outbound Campaigns
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN email TEXT').catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN website TEXT').catch(() => {});
  await dbConnection.exec("ALTER TABLE leads ADD COLUMN campaign_status TEXT DEFAULT 'none'").catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN last_emailed_at TEXT').catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN follow_up_count INTEGER DEFAULT 0').catch(() => {});

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      message TEXT NOT NULL,
      resolution TEXT,
      created_at TEXT NOT NULL
    )
  `).catch(() => {});

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS email_campaigns (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      email_type TEXT NOT NULL,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      sent_at TEXT NOT NULL,
      opened_at TEXT,
      replied_at TEXT,
      status TEXT NOT NULL DEFAULT 'sent'
    )
  `).catch(() => {});

  return dbConnection;
}
