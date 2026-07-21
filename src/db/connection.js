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
 * Auto-creates all required tables on first initialization.
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

  // 1. Core Tables Creation
  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      niche TEXT NOT NULL,
      owner_email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      stripe_status TEXT DEFAULT 'trial',
      custom_domain TEXT,
      design_brief_json TEXT,
      created_at TEXT NOT NULL
    )
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      business_name TEXT NOT NULL,
      niche TEXT NOT NULL,
      city TEXT,
      rating REAL DEFAULT 4.5,
      phone TEXT,
      email TEXT,
      website TEXT,
      status TEXT DEFAULT 'new',
      campaign_status TEXT DEFAULT 'none',
      last_emailed_at TEXT,
      follow_up_count INTEGER DEFAULT 0,
      outreach_channel TEXT DEFAULT 'email',
      review_audit_json TEXT
    )
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      service_name TEXT NOT NULL,
      booking_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      confirmed_slot TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS analytics (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    )
  `);

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
  `);

  await dbConnection.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      sender TEXT NOT NULL,
      message TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (lead_id) REFERENCES leads(id)
    )
  `);

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
  `);

  // 2. Safe Column Migrations for existing DBs
  await dbConnection.exec('ALTER TABLE bookings ADD COLUMN confirmed_slot TEXT').catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN email TEXT').catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN website TEXT').catch(() => {});
  await dbConnection.exec("ALTER TABLE leads ADD COLUMN campaign_status TEXT DEFAULT 'none'").catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN last_emailed_at TEXT').catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN follow_up_count INTEGER DEFAULT 0').catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN phone TEXT').catch(() => {});
  await dbConnection.exec("ALTER TABLE leads ADD COLUMN outreach_channel TEXT DEFAULT 'email'").catch(() => {});
  await dbConnection.exec('ALTER TABLE leads ADD COLUMN review_audit_json TEXT').catch(() => {});

  return dbConnection;
}
