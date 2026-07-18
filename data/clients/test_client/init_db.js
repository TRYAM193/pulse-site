import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import bcrypt from 'bcryptjs';

async function initializeDatabase() {
  try {
    const db = await open({
      filename: './bookings.sqlite',
      driver: sqlite3.Database
    });

    await db.exec(`
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        customer_name TEXT NOT NULL,
        customer_email TEXT NOT NULL,
        service_name TEXT NOT NULL,
        booking_date TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        email TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL
      );
    `);

    console.log('Database tables created or already exist.');

    // Insert default admin user if not exists
    const adminEmail = 'admin@test_client.com';
    const adminPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(adminPassword, 10); // Salt rounds

    const existingAdmin = await db.get('SELECT * FROM users WHERE email = ?', adminEmail);
    if (!existingAdmin) {
      await db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', adminEmail, hashedPassword);
      console.log(`Default admin user '${adminEmail}' inserted.`);
    } else {
      console.log(`Admin user '${adminEmail}' already exists.`);
    }

    await db.close();
    console.log('Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase();
