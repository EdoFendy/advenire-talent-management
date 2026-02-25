// Advenire Talent Management - Express API Server
import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import {
    initializeDatabase,
    talentsDB,
    clientsDB,
    campaignsDB,
    campaignTalentsDB,
    tasksDB,
    homeNotesDB,
    appointmentsDB,
    incomeDB,
    extraCostsDB,
    notificationsDB,
    quotesDB,
    searchDB,
    usersDB
} from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Static files for uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.params.type || 'misc';
        const dir = path.join(uploadsDir, type);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'];
        const allowedMimes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            'application/pdf', 'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/csv', 'text/plain', 'application/csv', 'application/octet-stream'
        ];

        if (allowedExtensions.includes(ext) || allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            console.error(`Rejected file: ${file.originalname} (mimetype: ${file.mimetype}, ext: ${ext})`);
            cb(new Error(`Tipo di file non supportato: ${file.mimetype}`));
        }
    }
});

// Initialize database
initializeDatabase();

// ============== HEALTH CHECK ==============
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', online: true });
});

// ============== AUTH API ==============
app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
        const { email, username, identifier, password } = req.body;
        const loginValue = identifier || email || username;

        if (!loginValue) {
            return res.status(400).json({ error: 'Username o Email richiesti' });
        }

        let user = usersDB.findByEmail(loginValue) as any;
        if (!user) {
            user = usersDB.findByUsername(loginValue) as any;
        }

        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Credenziali non valide' });
        }

        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auth/me', (req: Request, res: Response) => {
    res.json({ status: 'ok' });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
    res.json({ success: true });
});

app.put('/api/auth/password', (req: Request, res: Response) => {
    try {
        const { userId, newPassword } = req.body;
        usersDB.update(userId, { password: newPassword });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== TALENTS API ==============
app.get('/api/talents', (req: Request, res: Response) => {
    try {
        const talents = talentsDB.getAll();
        res.json(talents);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/talents/:id', (req: Request, res: Response) => {
    try {
        const talent = talentsDB.getById(req.params.id);
        if (!talent) {
            return res.status(404).json({ error: 'Talent non trovato' });
        }
        res.json(talent);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/talents/:id/credentials', (req: Request, res: Response) => {
    try {
        const user = usersDB.getByTalentId(req.params.id) as any;
        if (!user) {
            return res.status(404).json({ error: 'Utente per talent non trovato' });
        }
        res.json({
            username: user.username,
            email: user.email,
            password: user.password
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/talents/:id/credentials', (req: Request, res: Response) => {
    try {
        const user = usersDB.getByTalentId(req.params.id) as any;
        if (!user) {
            return res.status(404).json({ error: 'Utente per talent non trovato' });
        }
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'La password deve essere di almeno 6 caratteri' });
        }
        usersDB.update(user.id, { password: newPassword });
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/talents/:id/finance', (req: Request, res: Response) => {
    try {
        const talentId = req.params.id;
        const talent = talentsDB.getById(talentId);
        if (!talent) {
            return res.status(404).json({ error: 'Talent non trovato' });
        }

        const campaignTalents = campaignTalentsDB.getByTalent(talentId) as any[];

        // Enrich with client info
        const campaigns = campaignTalents.map((ct: any) => {
            let clientName = '';
            if (ct.client_id) {
                const client = clientsDB.getById(ct.client_id) as any;
                clientName = client?.ragione_sociale || '';
            }
            return {
                ...ct,
                client_name: clientName
            };
        });

        const totalEarned = campaigns.reduce((acc: number, ct: any) => acc + (ct.compenso_lordo || 0), 0);
        const totalPaid = campaigns.filter((ct: any) => ct.stato === 'pagato').reduce((acc: number, ct: any) => acc + (ct.compenso_lordo || 0), 0);
        const totalUnpaid = totalEarned - totalPaid;

        res.json({
            campaigns,
            totals: {
                earned: totalEarned,
                paid: totalPaid,
                unpaid: totalUnpaid
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/talents', (req: Request, res: Response) => {
    try {
        const talent = talentsDB.create({
            id: `t-${Date.now()}`,
            ...req.body
        });

        // Create User for Talent
        const password = Math.random().toString(36).slice(-8);
        const username = `${talent.firstName.toLowerCase().replace(/\s/g, '')}.${talent.lastName.toLowerCase().replace(/\s/g, '')}`;
        const user = usersDB.create({
            id: `u-${talent.id}`,
            name: talent.firstName + ' ' + talent.lastName,
            username: username,
            email: talent.email || `${username}@advenire.local`,
            password: password,
            role: 'talent',
            talentId: talent.id
        });

        // Create notification
        notificationsDB.create({
            id: `notif-${Date.now()}`,
            type: 'talent_created',
            title: 'Nuovo Talent Aggiunto',
            message: `${talent.firstName} ${talent.lastName} aggiunto al roster`,
            link: `/roster/${talent.id}`
        });

        res.status(201).json({ talent, credentials: { email: user.email, password } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Import talents from mapped JSON data (used by wizard)
app.post('/api/talents/import', (req: Request, res: Response) => {
    try {
        const { rows } = req.body;
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ error: 'Nessun dato da importare' });
        }

        const results: any[] = [];
        const errors: string[] = [];

        // Valid talent field keys that map directly to DB columns
        const directFields = [
            'firstName', 'lastName', 'stageName', 'display_name', 'phone', 'email',
            'tiktok', 'tiktokFollowers', 'instagram', 'instagramFollowers',
            'youtube_url', 'twitch_url', 'other_socials',
            'address_street', 'address_city', 'address_zip', 'address_country',
            'payout_method', 'iban', 'bank_name', 'paypal_email', 'vat', 'fiscal_code',
            'billing_name', 'billing_address_street', 'billing_address_city',
            'billing_address_zip', 'billing_address_country', 'notes', 'status'
        ];

        for (let i = 0; i < rows.length; i++) {
            try {
                const row = rows[i];
                const nome = (row.firstName || '').trim();
                const cognome = (row.lastName || '').trim();

                if (!nome || !cognome) {
                    errors.push(`Riga ${i + 1} (${nome} ${cognome}): Nome e Cognome sono obbligatori`);
                    continue;
                }

                const email = (row.email || '').trim() || `${nome.toLowerCase().replace(/\s/g, '')}.${cognome.toLowerCase().replace(/\s/g, '')}@import.com`;
                const phone = (row.phone || '').trim();

                // Dedup: check by email or phone
                let existingTalent: any = null;
                const autoEmail = `${nome.toLowerCase().replace(/\s/g, '')}.${cognome.toLowerCase().replace(/\s/g, '')}@import.com`;
                if (email && email !== autoEmail) {
                    existingTalent = talentsDB.findByEmail(email);
                }
                if (!existingTalent && phone) {
                    existingTalent = talentsDB.findByPhone(phone);
                }

                if (existingTalent) {
                    // Update existing - only non-empty fields
                    const updates: any = {};
                    for (const field of directFields) {
                        const val = (row[field] || '').trim();
                        if (val) updates[field] = val;
                    }
                    if (!updates.stageName) updates.stageName = `${nome} ${cognome}`.trim();

                    talentsDB.update(existingTalent.id, updates);
                    results.push({ action: 'updated', talent: existingTalent });
                } else {
                    const talentId = `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                    const talent: any = {
                        id: talentId,
                        firstName: nome,
                        lastName: cognome,
                        stageName: (row.stageName || '').trim() || `${nome} ${cognome}`.trim(),
                        email: email,
                        phone: phone,
                        status: (row.status || '').trim() || 'active',
                        photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(nome)}+${encodeURIComponent(cognome)}&background=random`
                    };

                    // Copy all mapped fields
                    for (const field of directFields) {
                        if (row[field] && !talent[field]) {
                            talent[field] = (row[field] || '').trim();
                        }
                    }

                    talentsDB.create(talent);

                    // Create user account
                    const pwd = Math.random().toString(36).slice(-8);
                    const uname = `${nome.toLowerCase().replace(/\s/g, '')}.${cognome.toLowerCase().replace(/\s/g, '')}`;
                    try {
                        usersDB.create({
                            id: `u-${talentId}`,
                            name: `${nome} ${cognome}`,
                            username: uname,
                            email: email,
                            password: pwd,
                            role: 'talent',
                            talentId: talentId
                        });
                    } catch (e: any) {
                        console.warn(`Impossibile creare utente per ${email}: ${e.message}`);
                    }

                    results.push({ action: 'created', talent, password: pwd });
                }
            } catch (error: any) {
                console.error(`Errore importando riga ${i + 1}:`, error);
                errors.push(`Riga ${i + 1}: ${error.message}`);
            }
        }

        const created = results.filter(r => r.action === 'created').length;
        const updated = results.filter(r => r.action === 'updated').length;

        // Collect credentials for newly created talents
        const credentials = results
            .filter(r => r.action === 'created' && r.password)
            .map(r => ({
                name: `${r.talent.firstName} ${r.talent.lastName}`,
                email: r.talent.email,
                password: r.password
            }));

        res.json({
            success: true,
            imported: created,
            updated: updated,
            skipped: 0,
            errors: errors.length > 0 ? errors : undefined,
            errorCount: errors.length,
            credentials: credentials.length > 0 ? credentials : undefined
        });
    } catch (error: any) {
        console.error('Processo di importazione fallito:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/talents/:id', (req: Request, res: Response) => {
    try {
        const talent = talentsDB.update(req.params.id, req.body);
        if (!talent) {
            return res.status(404).json({ error: 'Talent non trovato' });
        }
        res.json(talent);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/talents/:id', (req: Request, res: Response) => {
    try {
        talentsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Talent file uploads
app.post('/api/talents/:id/upload/:type', upload.single('file'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Nessun file caricato' });
        }

        const talent = talentsDB.getById(req.params.id);
        if (!talent) {
            return res.status(404).json({ error: 'Talent non trovato' });
        }

        const fileUrl = `/uploads/${req.params.type}/${req.file.filename}`;
        const uploadType = req.params.type;

        if (uploadType === 'gallery') {
            const gallery = [...(talent.gallery || []), fileUrl];
            talentsDB.update(req.params.id, { gallery });
        } else if (uploadType === 'attachments') {
            const attachment = {
                id: `att-${Date.now()}`,
                name: req.body.name || req.file.originalname,
                type: req.body.attachmentType || 'document',
                url: fileUrl,
                size: `${(req.file.size / 1024).toFixed(1)} KB`
            };
            const attachments = [...(talent.attachments || []), attachment];
            talentsDB.update(req.params.id, { attachments });
        } else if (uploadType === 'photo') {
            talentsDB.update(req.params.id, { photoUrl: fileUrl });
        }

        res.json({ url: fileUrl, success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== CLIENTS API ==============
app.get('/api/clients', (req: Request, res: Response) => {
    try {
        const clients = clientsDB.getAll();
        res.json(clients);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clients/:id', (req: Request, res: Response) => {
    try {
        const client = clientsDB.getById(req.params.id);
        if (!client) {
            return res.status(404).json({ error: 'Cliente non trovato' });
        }
        res.json(client);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/clients/:id/campaigns', (req: Request, res: Response) => {
    try {
        const campaigns = clientsDB.getCampaigns(req.params.id);
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/clients', (req: Request, res: Response) => {
    try {
        const client = clientsDB.create({
            id: `client-${Date.now()}`,
            ...req.body
        });
        res.status(201).json(client);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/clients/:id', (req: Request, res: Response) => {
    try {
        const client = clientsDB.update(req.params.id, req.body);
        if (!client) {
            return res.status(404).json({ error: 'Cliente non trovato' });
        }
        res.json(client);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/clients/:id', (req: Request, res: Response) => {
    try {
        clientsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== CAMPAIGNS API ==============
app.get('/api/campaigns', (req: Request, res: Response) => {
    try {
        const campaigns = campaignsDB.getAll();
        res.json(campaigns);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/campaigns/:id', (req: Request, res: Response) => {
    try {
        const campaign = campaignsDB.getById(req.params.id);
        if (!campaign) {
            return res.status(404).json({ error: 'Campagna non trovata' });
        }

        // Get related data
        const talents = campaignTalentsDB.getByCampaign(req.params.id);
        const incomeItems = incomeDB.getByCampaign(req.params.id);
        const costs = extraCostsDB.getByCampaign(req.params.id);
        const tasks = tasksDB.getAll({ related_type: 'campaign', related_id: req.params.id });

        // Get client info
        let client = null;
        if ((campaign as any).client_id) {
            client = clientsDB.getById((campaign as any).client_id);
        }

        res.json({
            ...campaign,
            campaignTalents: talents,
            income: incomeItems,
            extraCosts: costs,
            tasks,
            client
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/campaigns', (req: Request, res: Response) => {
    try {
        const campaignId = `c-${Date.now()}`;
        const data = req.body;

        // Support both old format { campaign: {...}, linkTalent: {...} } and new format
        const campaignData = data.campaign || data;

        const campaign = campaignsDB.create({
            id: campaignId,
            ...campaignData
        });

        // If talents are provided (new wizard format)
        if (data.talents && Array.isArray(data.talents)) {
            for (const t of data.talents) {
                campaignTalentsDB.create({
                    id: `ct-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                    campaign_id: campaignId,
                    talent_id: t.talent_id,
                    compenso_lordo: t.compenso_lordo || 0,
                    stato: 'invitato',
                    note: t.note || null
                });
            }
        }

        // Legacy support: linkTalent
        if (data.linkTalent && data.linkTalent.enabled && data.linkTalent.talentId) {
            const talent = talentsDB.getById(data.linkTalent.talentId);
            if (talent) {
                const totalBudget = Number(campaignData.totalBudget) || 0;
                const agencyFeePercent = Number(campaignData.agencyFeePercent) || 30;
                const talentFee = Math.floor(totalBudget * (1 - agencyFeePercent / 100));

                campaignTalentsDB.create({
                    id: `ct-${Date.now()}`,
                    campaign_id: campaignId,
                    talent_id: talent.id,
                    compenso_lordo: talentFee,
                    stato: 'confermato'
                });

                const activityDate = data.linkTalent.activityDate ? new Date(data.linkTalent.activityDate).toISOString() : new Date().toISOString();

                appointmentsDB.create({
                    id: `app-${Date.now()}`,
                    talentId: talent.id,
                    talentName: talent.stageName || `${talent.firstName} ${talent.lastName}`,
                    brand: campaignData.brand || '',
                    type: 'Shooting',
                    date: activityDate,
                    status: 'planned',
                    description: `Shooting per ${campaignData.name}`
                });

                notificationsDB.create({
                    id: `notif-${Date.now()}`,
                    userId: talent.id,
                    type: 'new_collaboration',
                    title: 'Nuova Collaborazione',
                    message: `Sei stato assegnato alla campagna ${campaignData.name}`,
                    link: `/my-calendar`
                });
            }
        }

        // Create income entry
        if (campaignData.totalBudget) {
            incomeDB.create({
                id: `inc-${Date.now()}`,
                campaignId: campaignId,
                amount: Number(campaignData.totalBudget) || 0,
                status: 'pending',
                expectedDate: campaignData.data_fine || campaignData.deadline || null
            });
        }

        res.status(201).json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/campaigns/:id', (req: Request, res: Response) => {
    try {
        const campaign = campaignsDB.update(req.params.id, req.body);
        if (!campaign) {
            return res.status(404).json({ error: 'Campagna non trovata' });
        }
        res.json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/campaigns/:id', (req: Request, res: Response) => {
    try {
        campaignsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== CAMPAIGN TALENTS API ==============
app.get('/api/campaign-talents', (req: Request, res: Response) => {
    try {
        const { campaignId, talentId } = req.query;

        if (campaignId) {
            res.json(campaignTalentsDB.getByCampaign(campaignId as string));
        } else if (talentId) {
            res.json(campaignTalentsDB.getByTalent(talentId as string));
        } else {
            res.json(campaignTalentsDB.getAll());
        }
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/campaign-talents', (req: Request, res: Response) => {
    try {
        const ct = campaignTalentsDB.create({
            id: `ct-${Date.now()}`,
            ...req.body
        });
        res.status(201).json(ct);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/campaign-talents/:id', (req: Request, res: Response) => {
    try {
        const ct = campaignTalentsDB.update(req.params.id, req.body);
        if (!ct) {
            return res.status(404).json({ error: 'Record non trovato' });
        }
        res.json(ct);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/campaign-talents/:id', (req: Request, res: Response) => {
    try {
        campaignTalentsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== TASKS API ==============
app.get('/api/tasks', (req: Request, res: Response) => {
    try {
        const filters: any = {};
        if (req.query.status) filters.status = req.query.status;
        if (req.query.priority) filters.priority = req.query.priority;
        if (req.query.due_date) filters.due_date = req.query.due_date;
        if (req.query.due_date_from) filters.due_date_from = req.query.due_date_from;
        if (req.query.due_date_to) filters.due_date_to = req.query.due_date_to;
        if (req.query.related_type) filters.related_type = req.query.related_type;
        if (req.query.related_id) filters.related_id = req.query.related_id;

        const tasks = tasksDB.getAll(Object.keys(filters).length > 0 ? filters : undefined);
        res.json(tasks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/tasks/:id', (req: Request, res: Response) => {
    try {
        const task = tasksDB.getById(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Attivita non trovata' });
        }
        res.json(task);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tasks', (req: Request, res: Response) => {
    try {
        const task = tasksDB.create({
            id: `task-${Date.now()}`,
            ...req.body
        });
        res.status(201).json(task);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tasks/:id', (req: Request, res: Response) => {
    try {
        const task = tasksDB.update(req.params.id, req.body);
        if (!task) {
            return res.status(404).json({ error: 'Attivita non trovata' });
        }
        res.json(task);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tasks/:id', (req: Request, res: Response) => {
    try {
        tasksDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== HOME NOTES API ==============
app.get('/api/home-notes', (req: Request, res: Response) => {
    try {
        const note = homeNotesDB.get();
        res.json(note);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/home-notes', (req: Request, res: Response) => {
    try {
        const { note_text } = req.body;
        const note = homeNotesDB.upsert(note_text || '');
        res.json(note);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== APPOINTMENTS API ==============
app.get('/api/appointments', (req: Request, res: Response) => {
    try {
        const { talentId } = req.query;
        let appointments;

        if (talentId) {
            appointments = appointmentsDB.getByTalent(talentId as string);
        } else {
            appointments = appointmentsDB.getAll();
        }

        res.json(appointments);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/appointments', (req: Request, res: Response) => {
    try {
        const appointment = appointmentsDB.create({
            id: `app-${Date.now()}`,
            ...req.body
        });
        res.status(201).json(appointment);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/appointments/:id', (req: Request, res: Response) => {
    try {
        const appointment = appointmentsDB.update(req.params.id, req.body);
        if (!appointment) {
            return res.status(404).json({ error: 'Appuntamento non trovato' });
        }
        res.json(appointment);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/appointments/:id', (req: Request, res: Response) => {
    try {
        appointmentsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== INCOME API ==============
app.get('/api/income', (req: Request, res: Response) => {
    try {
        const { campaignId } = req.query;
        let income;

        if (campaignId) {
            income = incomeDB.getByCampaign(campaignId as string);
        } else {
            income = incomeDB.getAll();
        }

        res.json(income);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/income', (req: Request, res: Response) => {
    try {
        const income = incomeDB.create({
            id: `inc-${Date.now()}`,
            ...req.body
        });
        res.status(201).json(income);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/income/:id', (req: Request, res: Response) => {
    try {
        const income = incomeDB.update(req.params.id, req.body);
        if (!income) {
            return res.status(404).json({ error: 'Entrata non trovata' });
        }
        res.json(income);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/income/:id', (req: Request, res: Response) => {
    try {
        incomeDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== EXTRA COSTS API ==============
app.get('/api/costs', (req: Request, res: Response) => {
    try {
        const { campaignId } = req.query;
        let costs;

        if (campaignId) {
            costs = extraCostsDB.getByCampaign(campaignId as string);
        } else {
            costs = extraCostsDB.getAll();
        }

        res.json(costs);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/costs', (req: Request, res: Response) => {
    try {
        const cost = extraCostsDB.create({
            id: `cost-${Date.now()}`,
            ...req.body
        });
        res.status(201).json(cost);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/costs/:id', (req: Request, res: Response) => {
    try {
        const cost = extraCostsDB.update(req.params.id, req.body);
        if (!cost) {
            return res.status(404).json({ error: 'Costo non trovato' });
        }
        res.json(cost);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/costs/:id', (req: Request, res: Response) => {
    try {
        extraCostsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== NOTIFICATIONS API ==============
app.get('/api/notifications', (req: Request, res: Response) => {
    try {
        const { userId, unreadOnly } = req.query;
        let notifications;

        if (unreadOnly === 'true') {
            notifications = notificationsDB.getUnread(userId as string);
        } else {
            notifications = notificationsDB.getAll(userId as string);
        }

        res.json(notifications);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/notifications/:id/read', (req: Request, res: Response) => {
    try {
        notificationsDB.markAsRead(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/notifications/read-all', (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        notificationsDB.markAllAsRead(userId as string);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== SEARCH API ==============
app.get('/api/search', (req: Request, res: Response) => {
    try {
        const { q } = req.query;
        if (!q || (q as string).length < 2) {
            return res.json([]);
        }
        const results = searchDB.global(q as string);
        res.json(results);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== ANALYTICS API ==============
app.get('/api/analytics', (req: Request, res: Response) => {
    try {
        const campaigns = campaignsDB.getAll() as any[];
        const allCampaignTalents = campaignTalentsDB.getAll() as any[];
        const allIncome = incomeDB.getAll() as any[];
        const allCosts = extraCostsDB.getAll() as any[];
        const talents = talentsDB.getAll();

        const fatturato = campaigns.reduce((acc, c) => acc + (c.totalBudget || 0), 0);
        const talentPayouts = allCampaignTalents.reduce((acc, ct) => acc + (ct.compenso_lordo || 0), 0);
        const totalExtraCosts = allCosts.reduce((acc, c) => acc + (c.amount || 0), 0);
        const utile = fatturato - talentPayouts - totalExtraCosts;

        const incassoRicevuto = allIncome.filter((i: any) => i.status === 'received').reduce((acc: number, i: any) => acc + i.amount, 0);
        const incassoPending = allIncome.filter((i: any) => i.status === 'pending').reduce((acc: number, i: any) => acc + i.amount, 0);

        const ctPaid = allCampaignTalents.filter((ct: any) => ct.stato === 'pagato').length;
        const ctUnpaid = allCampaignTalents.filter((ct: any) => ct.stato !== 'pagato').length;

        res.json({
            totals: {
                fatturato,
                talentPayouts,
                extraCosts: totalExtraCosts,
                utile,
                marginPercentage: fatturato > 0 ? ((utile / fatturato) * 100).toFixed(1) : 0
            },
            income: {
                received: incassoRicevuto,
                pending: incassoPending
            },
            campaignTalents: {
                total: allCampaignTalents.length,
                paid: ctPaid,
                unpaid: ctUnpaid
            },
            talents: {
                total: talents.length,
                active: talents.filter(t => t.status === 'active').length
            },
            campaigns: {
                total: campaigns.length,
                active: campaigns.filter((c: any) => c.status === 'Attiva').length,
                closed: campaigns.filter((c: any) => c.status === 'Chiusa').length
            }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// ============== QUOTES ENDPOINTS ==============
app.get('/api/quotes', (req: Request, res: Response) => {
    try {
        const filters: any = {};
        if (req.query.client_id) filters.client_id = req.query.client_id;
        if (req.query.stato) filters.stato = req.query.stato;
        const quotes = quotesDB.getAll(Object.keys(filters).length > 0 ? filters : undefined);
        res.json(quotes);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/quotes/:id', (req: Request, res: Response) => {
    try {
        const quote = quotesDB.getById(req.params.id);
        if (!quote) return res.status(404).json({ error: 'Preventivo non trovato' });
        res.json(quote);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/quotes', (req: Request, res: Response) => {
    try {
        const quote = quotesDB.create(req.body);
        res.status(201).json(quote);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/quotes/:id', (req: Request, res: Response) => {
    try {
        const quote = quotesDB.update(req.params.id, req.body);
        res.json(quote);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/quotes/:id', (req: Request, res: Response) => {
    try {
        quotesDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Advenire API Server running on http://localhost:${PORT}`);
});

export default app;
