-- Supabase PostgreSQL Schema for PulseSite AutoAgency

-- 1. Clients Table
CREATE TABLE IF NOT EXISTS clients (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  niche TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  stripe_status TEXT DEFAULT 'trial',
  custom_domain TEXT,
  design_brief_json TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Leads Table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  business_name TEXT NOT NULL,
  niche TEXT NOT NULL,
  city TEXT,
  rating NUMERIC DEFAULT 4.5,
  phone TEXT,
  email TEXT,
  website TEXT,
  status TEXT DEFAULT 'new',
  campaign_status TEXT DEFAULT 'none',
  last_emailed_at TIMESTAMPTZ,
  follow_up_count INT DEFAULT 0,
  outreach_channel TEXT DEFAULT 'email',
  review_audit_json TEXT
);

-- 3. Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  service_name TEXT NOT NULL,
  booking_date TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  confirmed_slot TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Analytics Table
CREATE TABLE IF NOT EXISTS analytics (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Incidents Table
CREATE TABLE IF NOT EXISTS incidents (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  title TEXT NOT NULL,
  severity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  message TEXT NOT NULL,
  resolution TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Conversations Table (AI Sales Chat & Outreach History)
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  channel TEXT NOT NULL,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Email Campaigns Table
CREATE TABLE IF NOT EXISTS email_campaigns (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'sent'
);

-- Row Level Security (RLS) Policies (Enable public read/write via Service Role Key / API)
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select on clients" ON clients FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access on clients" ON clients FOR ALL USING (true);

CREATE POLICY "Allow public select on leads" ON leads FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access on leads" ON leads FOR ALL USING (true);

CREATE POLICY "Allow public select on bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow service_role full access on bookings" ON bookings FOR ALL USING (true);

CREATE POLICY "Allow public insert on analytics" ON analytics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service_role full access on analytics" ON analytics FOR ALL USING (true);

CREATE POLICY "Allow service_role full access on incidents" ON incidents FOR ALL USING (true);
CREATE POLICY "Allow service_role full access on conversations" ON conversations FOR ALL USING (true);
CREATE POLICY "Allow service_role full access on email_campaigns" ON email_campaigns FOR ALL USING (true);
