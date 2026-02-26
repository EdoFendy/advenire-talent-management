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

  // Migration: Add columns to talents if they don't exist
  const talentMigrations = [
    'ALTER TABLE talents ADD COLUMN taxNotes TEXT',
    'ALTER TABLE talents ADD COLUMN instagramFollowers INTEGER',
    'ALTER TABLE talents ADD COLUMN tiktokFollowers INTEGER',
    'ALTER TABLE talents ADD COLUMN display_name TEXT',
    'ALTER TABLE talents ADD COLUMN address_street TEXT',
    'ALTER TABLE talents ADD COLUMN address_city TEXT',
    'ALTER TABLE talents ADD COLUMN address_zip TEXT',
    'ALTER TABLE talents ADD COLUMN address_country TEXT',
    'ALTER TABLE talents ADD COLUMN payout_method TEXT',
    'ALTER TABLE talents ADD COLUMN paypal_email TEXT',
    'ALTER TABLE talents ADD COLUMN fiscal_code TEXT',
    'ALTER TABLE talents ADD COLUMN bank_name TEXT',
    'ALTER TABLE talents ADD COLUMN billing_name TEXT',
    'ALTER TABLE talents ADD COLUMN billing_address_street TEXT',
    'ALTER TABLE talents ADD COLUMN billing_address_city TEXT',
    'ALTER TABLE talents ADD COLUMN billing_address_zip TEXT',
    'ALTER TABLE talents ADD COLUMN billing_address_country TEXT',
    'ALTER TABLE talents ADD COLUMN youtube_url TEXT',
    'ALTER TABLE talents ADD COLUMN twitch_url TEXT',
    'ALTER TABLE talents ADD COLUMN other_socials TEXT',
    'ALTER TABLE talents ADD COLUMN notes TEXT',
  ];
  for (const sql of talentMigrations) {
    try { db.prepare(sql).run(); } catch (e) { /* column exists */ }
  }

  // Campaigns Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT,
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

  // Migration: Add new columns to campaigns
  const campaignMigrations = [
    'ALTER TABLE campaigns ADD COLUMN tipo TEXT DEFAULT \'Brand\'',
    'ALTER TABLE campaigns ADD COLUMN client_id TEXT',
    'ALTER TABLE campaigns ADD COLUMN data_inizio TEXT',
    'ALTER TABLE campaigns ADD COLUMN data_fine TEXT',
  ];
  for (const sql of campaignMigrations) {
    try { db.prepare(sql).run(); } catch (e) { /* column exists */ }
  }

  // Clients Table (replaces brands)
  db.exec(`
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY,
      tipo TEXT,
      ragione_sociale TEXT NOT NULL,
      referente TEXT,
      email TEXT,
      telefono TEXT,
      note TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Campaign Talents Table (replaces collaborations for campaign-talent linking)
  db.exec(`
    CREATE TABLE IF NOT EXISTS campaign_talents (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      talent_id TEXT NOT NULL,
      compenso_lordo REAL DEFAULT 0,
      stato TEXT DEFAULT 'invitato',
      note TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
      FOREIGN KEY (talent_id) REFERENCES talents(id) ON DELETE CASCADE
    )
  `);

  // Tasks Table (for Home page)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT,
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'normal',
      related_type TEXT,
      related_id TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Home Notes Table (pinned notes on home page)
  db.exec(`
    CREATE TABLE IF NOT EXISTS home_notes (
      id TEXT PRIMARY KEY,
      note_text TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration: Add new columns to campaign_talents
  const campaignTalentMigrations = [
    'ALTER TABLE campaign_talents ADD COLUMN deadline TEXT',
    'ALTER TABLE campaign_talents ADD COLUMN responded_at TEXT',
  ];
  for (const sql of campaignTalentMigrations) {
    try { db.prepare(sql).run(); } catch (e) { /* column exists */ }
  }

  // Migration: Add new columns to notifications
  const notificationMigrations = [
    'ALTER TABLE notifications ADD COLUMN action_required INTEGER DEFAULT 0',
    'ALTER TABLE notifications ADD COLUMN action_type TEXT',
    'ALTER TABLE notifications ADD COLUMN action_data TEXT',
  ];
  for (const sql of notificationMigrations) {
    try { db.prepare(sql).run(); } catch (e) { /* column exists */ }
  }

  // Migration: Add assigned_talent_id to tasks
  try { db.prepare('ALTER TABLE tasks ADD COLUMN assigned_talent_id TEXT').run(); } catch (e) { /* column exists */ }

  // Seed default home note if none exists
  const homeNote = db.prepare('SELECT * FROM home_notes LIMIT 1').get();
  if (!homeNote) {
    db.prepare('INSERT INTO home_notes (id, note_text) VALUES (?, ?)').run('home-note-1', '');
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
      FOREIGN KEY (talentId) REFERENCES talents(id) ON DELETE CASCADE
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

  // Quotes Table (Preventivatore)
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      titolo TEXT NOT NULL,
      tipo TEXT DEFAULT 'custom',
      client_id TEXT,
      campaign_id TEXT,
      stato TEXT DEFAULT 'bozza',
      note TEXT,
      subtotale REAL DEFAULT 0,
      iva_percent REAL DEFAULT 22,
      totale REAL DEFAULT 0,
      items TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
    )
  `);

  // Company Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS company_settings (
      id TEXT PRIMARY KEY DEFAULT 'company-1',
      ragione_sociale TEXT,
      piva TEXT,
      codice_fiscale TEXT,
      indirizzo_via TEXT,
      indirizzo_citta TEXT,
      indirizzo_cap TEXT,
      indirizzo_paese TEXT,
      email TEXT,
      telefono TEXT,
      pec TEXT,
      sdi TEXT,
      website TEXT,
      logo_url TEXT,
      note TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed default company settings if none exists
  const companySetting = db.prepare('SELECT * FROM company_settings LIMIT 1').get();
  if (!companySetting) {
    db.prepare('INSERT INTO company_settings (id, ragione_sociale) VALUES (?, ?)').run('company-1', 'Advenire');
  }

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

  // ===== DATA MIGRATION: brands → clients =====
  try {
    const brandsExist = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='brands'").get();
    if (brandsExist) {
      const brands = db.prepare('SELECT * FROM brands').all() as any[];
      if (brands.length > 0) {
        const existingClients = db.prepare('SELECT COUNT(*) as count FROM clients').get() as any;
        if (existingClients.count === 0) {
          const insertClient = db.prepare(`
            INSERT OR IGNORE INTO clients (id, tipo, ragione_sociale, referente, email, telefono, note, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const brand of brands) {
            insertClient.run(
              brand.id.replace('brand-', 'client-'),
              'Azienda',
              brand.name,
              brand.contactName || null,
              brand.email || null,
              brand.phone || null,
              brand.notes || null,
              brand.createdAt || new Date().toISOString(),
              brand.updatedAt || new Date().toISOString()
            );
          }
          // Update campaigns to link to new client_id
          const updateCampaign = db.prepare('UPDATE campaigns SET client_id = ? WHERE brand = ? AND client_id IS NULL');
          for (const brand of brands) {
            updateCampaign.run(brand.id.replace('brand-', 'client-'), brand.name);
          }
          console.log(`✅ Migrated ${brands.length} brands to clients`);
        }
      }
    }
  } catch (e) {
    console.warn('Brand migration skipped or already done');
  }

  // ===== DATA MIGRATION: collaborations → campaign_talents =====
  try {
    const collabsExist = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='collaborations'").get();
    if (collabsExist) {
      const collabs = db.prepare('SELECT * FROM collaborations').all() as any[];
      if (collabs.length > 0) {
        const existingCT = db.prepare('SELECT COUNT(*) as count FROM campaign_talents').get() as any;
        if (existingCT.count === 0) {
          const insertCT = db.prepare(`
            INSERT OR IGNORE INTO campaign_talents (id, campaign_id, talent_id, compenso_lordo, stato, note, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `);
          for (const collab of collabs) {
            // Map old paymentStatus to new stato
            let stato = 'invitato';
            if (collab.paymentStatus === 'Saldato') stato = 'pagato';
            else if (collab.status === 'Completata') stato = 'consegnato';
            else if (collab.status === 'Confermata') stato = 'confermato';

            insertCT.run(
              collab.id.replace('col-', 'ct-'),
              collab.campaignId,
              collab.talentId,
              collab.fee || 0,
              stato,
              collab.notes || null,
              collab.createdAt || new Date().toISOString(),
              collab.updatedAt || new Date().toISOString()
            );
          }
          console.log(`✅ Migrated ${collabs.length} collaborations to campaign_talents`);
        }
      }
    }
  } catch (e) {
    console.warn('Collaboration migration skipped or already done');
  }

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
    if (user) delete user.password;
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
    const stmt = db.prepare('SELECT * FROM talents ORDER BY firstName, lastName');
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

  findByEmail: (email: string) => {
    const stmt = db.prepare('SELECT * FROM talents WHERE email = ?');
    const talent = stmt.get(email) as any;
    if (!talent) return null;
    return {
      ...talent,
      gallery: JSON.parse(talent.gallery || '[]'),
      attachments: JSON.parse(talent.attachments || '[]')
    };
  },

  findByPhone: (phone: string) => {
    const stmt = db.prepare('SELECT * FROM talents WHERE phone = ?');
    const talent = stmt.get(phone) as any;
    if (!talent) return null;
    return {
      ...talent,
      gallery: JSON.parse(talent.gallery || '[]'),
      attachments: JSON.parse(talent.attachments || '[]')
    };
  },

  create: (talent: any) => {
    const stmt = db.prepare(`
      INSERT INTO talents (id, firstName, lastName, stageName, birthDate, phone, email,
        instagram, instagramFollowers, tiktok, tiktokFollowers, address, shippingNotes,
        iban, vat, taxNotes, photoUrl, status, gallery, attachments,
        display_name, address_street, address_city, address_zip, address_country,
        payout_method, paypal_email, fiscal_code, bank_name,
        billing_name, billing_address_street, billing_address_city, billing_address_zip, billing_address_country,
        youtube_url, twitch_url, other_socials, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      talent.id,
      talent.firstName,
      talent.lastName,
      talent.stageName || `${talent.firstName} ${talent.lastName}`.trim(),
      talent.birthDate || null,
      talent.phone || null,
      talent.email || '',
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
      JSON.stringify(talent.attachments || []),
      talent.display_name || null,
      talent.address_street || null,
      talent.address_city || null,
      talent.address_zip || null,
      talent.address_country || null,
      talent.payout_method || null,
      talent.paypal_email || null,
      talent.fiscal_code || null,
      talent.bank_name || null,
      talent.billing_name || null,
      talent.billing_address_street || null,
      talent.billing_address_city || null,
      talent.billing_address_zip || null,
      talent.billing_address_country || null,
      talent.youtube_url || null,
      talent.twitch_url || null,
      talent.other_socials || null,
      talent.notes || null
    );
    return talent;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
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

// ============== CLIENTS ==============
export const clientsDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM clients ORDER BY ragione_sociale');
    return stmt.all();
  },

  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM clients WHERE id = ?');
    return stmt.get(id);
  },

  create: (client: any) => {
    const stmt = db.prepare(`
      INSERT INTO clients (id, tipo, ragione_sociale, referente, email, telefono, note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      client.id,
      client.tipo || null,
      client.ragione_sociale,
      client.referente || null,
      client.email || null,
      client.telefono || null,
      client.note || null
    );
    return client;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE clients SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
    return clientsDB.getById(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM clients WHERE id = ?');
    stmt.run(id);
    return { success: true };
  },

  getCampaigns: (clientId: string) => {
    const stmt = db.prepare('SELECT * FROM campaigns WHERE client_id = ? ORDER BY createdAt DESC');
    return stmt.all(clientId);
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
      INSERT INTO campaigns (id, name, brand, tipo, client_id, totalBudget, agencyFeePercent, status, notes, data_inizio, data_fine, period, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      campaign.id,
      campaign.name,
      campaign.brand || null,
      campaign.tipo || 'Brand',
      campaign.client_id || null,
      campaign.totalBudget || 0,
      campaign.agencyFeePercent || 30,
      campaign.status || 'Bozza',
      campaign.notes || null,
      campaign.data_inizio || null,
      campaign.data_fine || null,
      campaign.period || null,
      campaign.deadline || null
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

// ============== CAMPAIGN TALENTS ==============
export const campaignTalentsDB = {
  getAll: () => {
    const stmt = db.prepare('SELECT * FROM campaign_talents ORDER BY createdAt DESC');
    return stmt.all();
  },

  getByCampaign: (campaignId: string) => {
    const stmt = db.prepare(`
      SELECT ct.*, t.firstName, t.lastName, t.stageName, t.photoUrl, t.email, t.phone
      FROM campaign_talents ct
      JOIN talents t ON ct.talent_id = t.id
      WHERE ct.campaign_id = ?
      ORDER BY ct.createdAt DESC
    `);
    return stmt.all(campaignId);
  },

  getByTalent: (talentId: string) => {
    const stmt = db.prepare(`
      SELECT ct.*, c.name as campaign_name, c.tipo as campaign_tipo, c.status as campaign_status,
             c.totalBudget, c.data_inizio, c.data_fine, c.client_id
      FROM campaign_talents ct
      JOIN campaigns c ON ct.campaign_id = c.id
      WHERE ct.talent_id = ?
      ORDER BY ct.createdAt DESC
    `);
    return stmt.all(talentId);
  },

  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM campaign_talents WHERE id = ?');
    return stmt.get(id);
  },

  create: (ct: any) => {
    const stmt = db.prepare(`
      INSERT INTO campaign_talents (id, campaign_id, talent_id, compenso_lordo, stato, note, deadline, responded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      ct.id,
      ct.campaign_id,
      ct.talent_id,
      ct.compenso_lordo || 0,
      ct.stato || 'invitato',
      ct.note || null,
      ct.deadline || null,
      ct.responded_at || null
    );
    return ct;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE campaign_talents SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
    return campaignTalentsDB.getById(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM campaign_talents WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== TASKS ==============
export const tasksDB = {
  getAll: (filters?: { status?: string; priority?: string; due_date?: string; due_date_from?: string; due_date_to?: string; related_type?: string; related_id?: string }) => {
    let query = 'SELECT * FROM tasks';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters) {
      if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
      if (filters.priority) { conditions.push('priority = ?'); params.push(filters.priority); }
      if (filters.due_date) { conditions.push('due_date = ?'); params.push(filters.due_date); }
      if (filters.due_date_from) { conditions.push('due_date >= ?'); params.push(filters.due_date_from); }
      if (filters.due_date_to) { conditions.push('due_date <= ?'); params.push(filters.due_date_to); }
      if (filters.related_type) { conditions.push('related_type = ?'); params.push(filters.related_type); }
      if (filters.related_id) { conditions.push('related_id = ?'); params.push(filters.related_id); }
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY due_date ASC, priority DESC';

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  getById: (id: string) => {
    const stmt = db.prepare('SELECT * FROM tasks WHERE id = ?');
    return stmt.get(id);
  },

  create: (task: any) => {
    const stmt = db.prepare(`
      INSERT INTO tasks (id, title, description, due_date, status, priority, related_type, related_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      task.id,
      task.title,
      task.description || null,
      task.due_date || null,
      task.status || 'todo',
      task.priority || 'normal',
      task.related_type || null,
      task.related_id || null
    );
    return task;
  },

  update: (id: string, updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return null;

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    const stmt = db.prepare(`UPDATE tasks SET ${setClause}, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`);
    stmt.run(...values, id);
    return tasksDB.getById(id);
  },

  delete: (id: string) => {
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(id);
    return { success: true };
  }
};

// ============== HOME NOTES ==============
export const homeNotesDB = {
  get: () => {
    const stmt = db.prepare('SELECT * FROM home_notes LIMIT 1');
    return stmt.get() || { id: 'home-note-1', note_text: '', updated_at: new Date().toISOString() };
  },

  upsert: (noteText: string) => {
    const existing = db.prepare('SELECT * FROM home_notes LIMIT 1').get() as any;
    if (existing) {
      db.prepare('UPDATE home_notes SET note_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(noteText, existing.id);
    } else {
      db.prepare('INSERT INTO home_notes (id, note_text) VALUES (?, ?)').run('home-note-1', noteText);
    }
    return homeNotesDB.get();
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
      INSERT INTO notifications (id, userId, type, title, message, link, action_required, action_type, action_data)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const id = notif.id || `notif-${Date.now()}`;
    stmt.run(
      id,
      notif.userId || null,
      notif.type,
      notif.title,
      notif.message || null,
      notif.link || null,
      notif.action_required ? 1 : 0,
      notif.action_type || null,
      notif.action_data || null
    );
    return { ...notif, id };
  },

  getActionRequired: (userId: string) => {
    const stmt = db.prepare('SELECT * FROM notifications WHERE userId = ? AND action_required = 1 AND read = 0 ORDER BY createdAt DESC');
    return stmt.all(userId);
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

// ============== QUOTES ==============
export const quotesDB = {
  getAll: (filters?: { client_id?: string; stato?: string }) => {
    let sql = 'SELECT * FROM quotes';
    const conditions: string[] = [];
    const params: any[] = [];

    if (filters?.client_id) {
      conditions.push('client_id = ?');
      params.push(filters.client_id);
    }
    if (filters?.stato) {
      conditions.push('stato = ?');
      params.push(filters.stato);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY createdAt DESC';

    const rows = db.prepare(sql).all(...params) as any[];
    return rows.map(row => ({
      ...row,
      items: JSON.parse(row.items || '[]')
    }));
  },

  getById: (id: string) => {
    const row = db.prepare('SELECT * FROM quotes WHERE id = ?').get(id) as any;
    if (!row) return null;
    return { ...row, items: JSON.parse(row.items || '[]') };
  },

  getByClient: (clientId: string) => {
    const rows = db.prepare('SELECT * FROM quotes WHERE client_id = ? ORDER BY createdAt DESC').all(clientId) as any[];
    return rows.map(row => ({ ...row, items: JSON.parse(row.items || '[]') }));
  },

  create: (quote: any) => {
    const id = quote.id || `quote-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    const stmt = db.prepare(`
      INSERT INTO quotes (id, titolo, tipo, client_id, campaign_id, stato, note, subtotale, iva_percent, totale, items)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      quote.titolo,
      quote.tipo || 'custom',
      quote.client_id || null,
      quote.campaign_id || null,
      quote.stato || 'bozza',
      quote.note || null,
      quote.subtotale || 0,
      quote.iva_percent ?? 22,
      quote.totale || 0,
      JSON.stringify(quote.items || [])
    );
    return quotesDB.getById(id);
  },

  update: (id: string, updates: any) => {
    const current = quotesDB.getById(id);
    if (!current) throw new Error('Preventivo non trovato');

    const merged = { ...current, ...updates };
    if (updates.items) {
      merged.items = updates.items;
    }

    const stmt = db.prepare(`
      UPDATE quotes SET titolo = ?, tipo = ?, client_id = ?, campaign_id = ?, stato = ?,
        note = ?, subtotale = ?, iva_percent = ?, totale = ?, items = ?, updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    stmt.run(
      merged.titolo,
      merged.tipo,
      merged.client_id || null,
      merged.campaign_id || null,
      merged.stato,
      merged.note || null,
      merged.subtotale,
      merged.iva_percent,
      merged.totale,
      JSON.stringify(merged.items),
      id
    );
    return quotesDB.getById(id);
  },

  delete: (id: string) => {
    db.prepare('DELETE FROM quotes WHERE id = ?').run(id);
    return { success: true };
  }
};

// ============== COMPANY SETTINGS ==============
export const companySettingsDB = {
  get: () => {
    const stmt = db.prepare('SELECT * FROM company_settings WHERE id = ?');
    return stmt.get('company-1') || { id: 'company-1', ragione_sociale: 'Advenire' };
  },

  update: (updates: any) => {
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return companySettingsDB.get();

    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = fields.map(f => updates[f]);

    db.prepare(`UPDATE company_settings SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = 'company-1'`).run(...values);
    return companySettingsDB.get();
  }
};

// ============== SEARCH ==============
export const searchDB = {
  global: (query: string) => {
    const searchTerm = `%${query}%`;

    const talents = db.prepare(`
      SELECT 'talent' as type, id, firstName || ' ' || lastName as name, email as subtitle
      FROM talents
      WHERE firstName LIKE ? OR lastName LIKE ? OR email LIKE ? OR stageName LIKE ?
    `).all(searchTerm, searchTerm, searchTerm, searchTerm);

    const campaigns = db.prepare(`
      SELECT 'campaign' as type, id, name, tipo as subtitle
      FROM campaigns
      WHERE name LIKE ?
    `).all(searchTerm);

    const clients = db.prepare(`
      SELECT 'client' as type, id, ragione_sociale as name, referente as subtitle
      FROM clients
      WHERE ragione_sociale LIKE ? OR referente LIKE ?
    `).all(searchTerm, searchTerm);

    return [...talents, ...campaigns, ...clients];
  }
};

export default db;
