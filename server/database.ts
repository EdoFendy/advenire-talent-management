// SQLite Database Module for Advenire Talent Management
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'advenire.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Initialize Database Schema
export function initializeDatabase() {
  // Talents Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS talents (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      stageName TEXT NOT NULL,
      birthDate TEXT,
      phone TEXT,
      email TEXT NOT NULL,
      instagram TEXT,
      instagramFollowers INTEGER,
      tiktok TEXT,
      tiktokFollowers INTEGER,
      address TEXT,
      shippingNotes TEXT,
      iban TEXT,
      vat TEXT,
      taxNotes TEXT,
      photoUrl TEXT,
      status TEXT DEFAULT 'active',
      gallery TEXT DEFAULT '[]',
      attachments TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add taxNotes to talents if it doesn't exist
  try {
    db.prepare('ALTER TABLE talents ADD COLUMN taxNotes TEXT').run();
  } catch (error) {
    // Column likely exists
  }

  // Brands Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      contactName TEXT,
      email TEXT,
      phone TEXT,
      website TEXT,
      vat TEXT,
      address TEXT,
      notes TEXT,
      logoUrl TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Campaigns Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL,
      period TEXT,
      deadline TEXT,
      totalBudget REAL DEFAULT 0,
      agencyFeePercent REAL DEFAULT 30,
      status TEXT DEFAULT 'Bozza',
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Collaborations Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS collaborations (
      id TEXT PRIMARY KEY,
      talentId TEXT NOT NULL,
      brand TEXT NOT NULL,
      campaignId TEXT NOT NULL,
      type TEXT NOT NULL,
      fee REAL DEFAULT 0,
      status TEXT DEFAULT 'Bozza',
      paymentStatus TEXT DEFAULT 'Non Saldato',
      paidAmount REAL DEFAULT 0,
      deadline TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (talentId) REFERENCES talents(id) ON DELETE CASCADE,
      FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Add paidAmount column if it doesn't exist (migration for existing db)
  try {
    db.prepare('ALTER TABLE collaborations ADD COLUMN paidAmount REAL DEFAULT 0').run();
  } catch (error) {
    // Column likely exists, ignore
  }

  // Appointments Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS appointments (
      id TEXT PRIMARY KEY,
      talentId TEXT NOT NULL,
      talentName TEXT NOT NULL,
      brand TEXT NOT NULL,
      type TEXT NOT NULL,
      date TEXT NOT NULL,
      deadline TEXT,
      status TEXT DEFAULT 'planned',
      collaborationId TEXT,
      description TEXT,
      location TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (talentId) REFERENCES talents(id) ON DELETE CASCADE,
      FOREIGN KEY (collaborationId) REFERENCES collaborations(id) ON DELETE SET NULL
    )
  `);

  // Income Table (Entrate)
  db.exec(`
    CREATE TABLE IF NOT EXISTS income (
      id TEXT PRIMARY KEY,
      campaignId TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      date TEXT,
      expectedDate TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Extra Costs Table (Uscite Extra)
  db.exec(`
    CREATE TABLE IF NOT EXISTS extraCosts (
      id TEXT PRIMARY KEY,
      campaignId TEXT NOT NULL,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT,
      provider TEXT,
      status TEXT DEFAULT 'unpaid',
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaignId) REFERENCES campaigns(id) ON DELETE CASCADE
    )
  `);

  // Notifications Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      userId TEXT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT,
      read INTEGER DEFAULT 0,
      link TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Users Table (for authentication)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT UNIQUE,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'team',
      talentId TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (talentId) REFERENCES talents(id) ON DELETE SET NULL
    )
  `);

  // Migration: Add username to users if it doesn't exist
  try {
    db.prepare('ALTER TABLE users ADD COLUMN username TEXT').run();
  } catch (error) {
    // Column likely exists
  }
  try {
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)').run();
  } catch (error) { }

  // Migration: Add follower columns to talents if missing
  try { db.prepare('ALTER TABLE talents ADD COLUMN instagramFollowers INTEGER').run(); } catch (e) { }
  try { db.prepare('ALTER TABLE talents ADD COLUMN tiktokFollowers INTEGER').run(); } catch (e) { }

  // Seed default admin
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get('admin@advenire.com');
  if (!admin) {
    db.prepare('INSERT INTO users (id, name, username, email, password, role) VALUES (?, ?, ?, ?, ?, ?)').run(
      'admin-1', 'Advenire Admin', 'admin', 'admin@advenire.com', 'admin123', 'admin'
    );
  }

  console.log('✅ Database initialized successfully');
}

// ============== USERS ==============
export const usersDB = {
  findByEmail: (email: string) => {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email);
  },

  findByUsername: (username: string) => {
    const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
    return stmt.get(username);
  },

  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(id) as any;
    if (user) delete user.password; // Don't return password
    return user;
  },

  getByTalentId: (talentId: string) => {
    const stmt = db.prepare('SELECT * FROM users WHERE talentId = ?');
    return stmt.get(talentId);
  },

  create: (user: any) => {
    const stmt = db.prepare(`
      INSERT INTO users (id, name, username, email, password, role, talentId)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      user.id,
      user.name,
      user.username || null,
      user.email,
      user.password,
      user.role || 'team',
      user.talentId || null
    );
    const { password, ...result } = user;
    return result;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE users SET ${setClause} WHERE id = ?`);
    stmt.run(...values, id);
    return usersDB.getById(id);
  }
};

// ============== TALENTS ==============
export const talentsDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM talents ORDER BY stageName');
    const talents = stmt.all();
    return talents.map((t: any) => ({
      ...t,
      gallery: JSON.parse(t.gallery || '[]'),
      attachments: JSON.parse(t.attachments || '[]')
    }));
  },

  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM talents WHERE id = ?');
    const talent = stmt.get(id) as any;
    if (!talent) return null;
    return {
      ...talent,
      gallery: JSON.parse(talent.gallery || '[]'),
      attachments: JSON.parse(talent.attachments || '[]')
    };
  },

  create: (talent: any) => {
    const stmt = db.prepare(`
      INSERT INTO talents (id, firstName, lastName, stageName, birthDate, phone, email, instagram, instagramFollowers, tiktok, tiktokFollowers, address, shippingNotes, iban, vat, taxNotes, photoUrl, status, gallery, attachments)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      talent.id,
      talent.firstName,
      talent.lastName,
      talent.stageName,
      talent.birthDate || null,
      talent.phone || null,
      talent.email,
      talent.instagram || null,
      talent.instagramFollowers || 0,
      talent.tiktok || null,
      talent.tiktokFollowers || 0,
      talent.address || null,
      talent.shippingNotes || null,
      talent.iban || null,
      talent.vat || null,
      talent.taxNotes || null,
      talent.photoUrl || null,
      talent.status || 'active',
      JSON.stringify(talent.gallery || []),
      JSON.stringify(talent.attachments || [])
    );
    return talent;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => {
      if (f === 'gallery' || f === 'attachments') {
        return `${f} = ?`;
      }
      return `${f} = ?`;
    }).join(', ');

    const values = fields.map(f => {
      if (f === 'gallery' || f === 'attachments') {
        return JSON.stringify(updates[f]);
      }
      return updates[f];
    });

    const stmt = db.prepare(`UPDATE talents SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
    return talentsDB.getById(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM talents WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== BRANDS ==============
export const brandsDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM brands ORDER BY name');
    return stmt.all();
  },

  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM brands WHERE id = ?');
    return stmt.get(id);
  },

  create: (brand: any) => {
    const stmt = db.prepare(`
      INSERT INTO brands (id, name, contactName, email, phone, website, vat, address, notes, logoUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      brand.id,
      brand.name,
      brand.contactName || null,
      brand.email || null,
      brand.phone || null,
      brand.website || null,
      brand.vat || null,
      brand.address || null,
      brand.notes || null,
      brand.logoUrl || null
    );
    return brand;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE brands SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
    return brandsDB.getById(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM brands WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== CAMPAIGNS ==============
export const campaignsDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM campaigns ORDER BY createdAt DESC');
    return stmt.all();
  },

  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM campaigns WHERE id = ?');
    return stmt.get(id);
  },

  create: (campaign: any) => {
    const stmt = db.prepare(`
      INSERT INTO campaigns (id, name, brand, period, deadline, totalBudget, agencyFeePercent, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      campaign.id,
      campaign.name,
      campaign.brand,
      campaign.period || null,
      campaign.deadline || null,
      campaign.totalBudget || 0,
      campaign.agencyFeePercent || 30,
      campaign.status || 'Attiva',
      campaign.notes || null
    );
    return campaign;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE campaigns SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
    return campaignsDB.getById(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM campaigns WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== COLLABORATIONS ==============
export const collaborationsDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM collaborations ORDER BY createdAt DESC');
    return stmt.all();
  },

  getByTalent: (talentId: string) => {
    const stmt = db.prepare('SELECT * FROM collaborations WHERE talentId = ? ORDER BY createdAt DESC');
    return stmt.all(talentId);
  },

  getByCampaign: (campaignId: string) => {
    const stmt = db.prepare('SELECT * FROM collaborations WHERE campaignId = ? ORDER BY createdAt DESC');
    return stmt.all(campaignId);
  },

  create: (collab: any) => {
    const stmt = db.prepare(`
      INSERT INTO collaborations (id, talentId, brand, campaignId, type, fee, status, paymentStatus, paidAmount, deadline, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      collab.id,
      collab.talentId,
      collab.brand,
      collab.campaignId,
      collab.type,
      collab.fee || 0,
      collab.status || 'Confermata',
      collab.paymentStatus || 'Non Saldato',
      collab.paidAmount || 0,
      collab.deadline || null,
      collab.notes || null
    );
    return collab;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE collaborations SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);

    const getStmt = db.prepare('SELECT * FROM collaborations WHERE id = ?');
    return getStmt.get(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM collaborations WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== APPOINTMENTS ==============
export const appointmentsDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM appointments ORDER BY date ASC');
    return stmt.all();
  },

  getByTalent: (talentId: string) => {
    const stmt = db.prepare('SELECT * FROM appointments WHERE talentId = ? ORDER BY date ASC');
    return stmt.all(talentId);
  },

  create: (app: any) => {
    const stmt = db.prepare(`
      INSERT INTO appointments (id, talentId, talentName, brand, type, date, deadline, status, collaborationId, description, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      app.id,
      app.talentId,
      app.talentName,
      app.brand,
      app.type,
      app.date,
      app.deadline || null,
      app.status || 'planned',
      app.collaborationId || null,
      app.description || null,
      app.location || null
    );
    return app;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE appointments SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);

    const getStmt = db.prepare('SELECT * FROM appointments WHERE id = ?');
    return getStmt.get(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM appointments WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== INCOME ==============
export const incomeDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM income ORDER BY date DESC');
    return stmt.all();
  },

  getByCampaign: (campaignId: string) => {
    const stmt = db.prepare('SELECT * FROM income WHERE campaignId = ?');
    return stmt.all(campaignId);
  },

  create: (inc: any) => {
    const stmt = db.prepare(`
      INSERT INTO income (id, campaignId, amount, status, date, expectedDate, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      inc.id,
      inc.campaignId,
      inc.amount,
      inc.status || 'pending',
      inc.date || null,
      inc.expectedDate || null,
      inc.notes || null
    );
    return inc;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE income SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);

    const getStmt = db.prepare('SELECT * FROM income WHERE id = ?');
    return getStmt.get(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM income WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== EXTRA COSTS ==============
export const extraCostsDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM extraCosts ORDER BY date DESC');
    return stmt.all();
  },

  getByCampaign: (campaignId: string) => {
    const stmt = db.prepare('SELECT * FROM extraCosts WHERE campaignId = ?');
    return stmt.all(campaignId);
  },

  create: (cost: any) => {
    const stmt = db.prepare(`
      INSERT INTO extraCosts (id, campaignId, category, amount, date, provider, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      cost.id,
      cost.campaignId,
      cost.category,
      cost.amount,
      cost.date || null,
      cost.provider || null,
      cost.status || 'unpaid',
      cost.notes || null
    );
    return cost;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE extraCosts SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);

    const getStmt = db.prepare('SELECT * FROM extraCosts WHERE id = ?');
    return getStmt.get(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM extraCosts WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== NOTIFICATIONS ==============
export const notificationsDB = {
  getAll: (userId?: string) => {
    if (userId) {
      const stmt = db.prepare('SELECT * FROM notifications WHERE userId = ? OR userId IS NULL ORDER BY createdAt DESC LIMIT 50');
      return stmt.all(userId);
    }
    const stmt = db.prepare('SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 50');
    return stmt.all();
  },

  getUnread: (userId?: string) => {
    if (userId) {
      const stmt = db.prepare('SELECT * FROM notifications WHERE (userId = ? OR userId IS NULL) AND read = 0 ORDER BY createdAt DESC');
      return stmt.all(userId);
    }
    const stmt = db.prepare('SELECT * FROM notifications WHERE read = 0 ORDER BY createdAt DESC');
    return stmt.all();
  },

  create: (notif: any) => {
    const stmt = db.prepare(`
      INSERT INTO notifications (id, userId, type, title, message, link)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      notif.id || `notif-${Date.now()}`,
      notif.userId || null,
      notif.type,
      notif.title,
      notif.message || null,
      notif.link || null
    );
    return notif;
  },

  markAsRead: (id: string) => {
    const stmt = db.prepare('UPDATE notifications SET read = 1 WHERE id = ?');
    stmt.run(id);
    return { success: true };
  },

  markAllAsRead: (userId?: string) => {
    if (userId) {
      const stmt = db.prepare('UPDATE notifications SET read = 1 WHERE userId = ? OR userId IS NULL');
      stmt.run(userId);
    } else {
      const stmt = db.prepare('UPDATE notifications SET read = 1');
      stmt.run();
    }
    return { success: true };
  }
};

// ============== SEARCH ==============
export const searchDB = {
  global: (query: string) => {
    const searchTerm = `%${query}%`;

    const talents = db.prepare(`
      SELECT 'talent' as type, id, stageName as name, firstName || ' ' || lastName as subtitle 
      FROM talents 
      WHERE stageName LIKE ? OR firstName LIKE ? OR lastName LIKE ? OR email LIKE ?
    `).all(searchTerm, searchTerm, searchTerm, searchTerm);

    const campaigns = db.prepare(`
      SELECT 'campaign' as type, id, name, brand as subtitle 
      FROM campaigns 
      WHERE name LIKE ? OR brand LIKE ?
    `).all(searchTerm, searchTerm);

    const collaborations = db.prepare(`
      SELECT 'collaboration' as type, id, brand as name, type as subtitle 
      FROM collaborations 
      WHERE brand LIKE ? OR type LIKE ?
    `).all(searchTerm, searchTerm);

    return [...talents, ...campaigns, ...collaborations];
  }
};

export default db;
