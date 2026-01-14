
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'advenire.db');
const db = new Database(dbPath);

console.log('🧹 Wiping all data from database...');

// Disable foreign keys temporarily to avoid constraint issues during wipe
db.pragma('foreign_keys = OFF');

const tables = [
    'collaborations',
    'appointments',
    'income',
    'extraCosts',
    'notifications',
    'brands',
    'campaigns',
    'talents',
    'users'
];

db.transaction(() => {
    for (const table of tables) {
        db.prepare(`DELETE FROM ${table}`).run();
        console.log(`- Cleared table: ${table}`);
    }

    // Re-seed the default admin
    console.log('👤 Re-seeding default admin...');
    db.prepare('INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, ?)').run(
        'admin-1', 'Advenire Admin', 'admin@advenire.com', 'admin123', 'admin'
    );
})();

db.pragma('foreign_keys = ON');

console.log('✅ Database wiped and reset to clean state (Admin only).');
process.exit(0);
