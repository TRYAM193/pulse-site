import { getDb } from './connection.js';

async function initDb() {
  console.log(`==================================================`);
  console.log(`🗃️  Initializing relational SQLite database schema...`);
  console.log(`==================================================\n`);

  try {
    const db = await getDb();

    // 1. Create leads table
    console.log(`Creating table: leads...`);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS leads (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        niche TEXT NOT NULL,
        city TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        rating REAL,
        lost_revenue REAL,
        status TEXT NOT NULL DEFAULT 'discovered',
        pitch_text TEXT,
        email TEXT,
        website TEXT,
        campaign_status TEXT DEFAULT 'none',
        last_emailed_at TEXT,
        follow_up_count INTEGER DEFAULT 0
      )
    `);

    // 2. Create clients table
    console.log(`Creating table: clients...`);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        business_name TEXT NOT NULL,
        niche TEXT NOT NULL,
        owner_email TEXT,
        password_hash TEXT,
        stripe_status TEXT NOT NULL DEFAULT 'trial',
        custom_domain TEXT,
        design_brief_json TEXT,
        created_at TEXT NOT NULL
      )
    `);

    // 3. Create bookings table
    console.log(`Creating table: bookings...`);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        service_name TEXT NOT NULL,
        booking_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    // 4. Create analytics table
    console.log(`Creating table: analytics...`);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    // 5. Create incidents table for Support Team Agent
    console.log(`Creating table: incidents...`);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS incidents (
        id TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        title TEXT NOT NULL,
        severity TEXT NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        status TEXT NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved'
        message TEXT NOT NULL,
        resolution TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    // 6. Create email_campaigns table for Outbound Campaigns
    console.log(`Creating table: email_campaigns...`);
    await db.exec(`
      CREATE TABLE IF NOT EXISTS email_campaigns (
        id TEXT PRIMARY KEY,
        lead_id TEXT NOT NULL,
        email_type TEXT NOT NULL, -- 'cold_intro', 'follow_up_1', 'follow_up_2', 'follow_up_3'
        subject TEXT NOT NULL,
        body_html TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        opened_at TEXT,
        replied_at TEXT,
        status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'opened', 'replied'
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
      )
    `);

    // Create Indexes for performance
    console.log(`Creating database indexes...`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_niche_city ON leads(niche, city)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_status)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_bookings_client ON bookings(client_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_analytics_client ON analytics(client_id)`);
    await db.exec(`CREATE INDEX IF NOT EXISTS idx_incidents_client ON incidents(client_id)`);

    console.log(`\n✅ Database initialized successfully!`);
  } catch (err) {
    console.error(`❌ Failed to initialize database:`, err.message);
    process.exit(1);
  }
}

// Run if called directly
const isDirectRun = process.argv[1] && (process.argv[1].endsWith('init.js') || process.argv[1].endsWith('init'));
if (isDirectRun) {
  initDb();
}

export { initDb };
