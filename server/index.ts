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
    brandsDB,
    campaignsDB,
    collaborationsDB,
    appointmentsDB,
    incomeDB,
    extraCostsDB,
    notificationsDB,
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
    // Mock user retrieval based on simulation - in real app, decode token
    // For now, client handles state
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

// ============== HEALTH CHECK ==============
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
            return res.status(404).json({ error: 'Talent not found' });
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
            return res.status(404).json({ error: 'User for talent not found' });
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

app.post('/api/talents', (req: Request, res: Response) => {
    try {
        const talent = talentsDB.create({
            id: `t-${Date.now()}`,
            ...req.body
        });

        // Create User for Talent
        const password = Math.random().toString(36).slice(-8); // Simple random password
        const username = `${talent.firstName.toLowerCase().replace(/\s/g, '')}.${talent.lastName.toLowerCase().replace(/\s/g, '')}`;
        const user = usersDB.create({
            id: `u-${talent.id}`,
            name: talent.firstName + ' ' + talent.lastName,
            username: username,
            email: talent.email,
            password: password,
            role: 'talent',
            talentId: talent.id
        });

        // Create notification
        notificationsDB.create({
            id: `notif-${Date.now()}`,
            type: 'talent_created',
            title: 'Nuovo Talent Aggiunto',
            message: `${talent.stageName} è stato aggiunto al roster`,
            link: `/roster/${talent.id}`
        });

        res.status(201).json({ talent, credentials: { email: user.email, password } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/talents/import', upload.single('file'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const csvPath = req.file.path;
        const csvContent = fs.readFileSync(csvPath, 'utf8');

        // Simple CSV Parser handling quotes
        const parseCSV = (text: string) => {
            const rows = [];
            let row: string[] = [];
            let field = '';
            let inQuotes = false;
            for (let i = 0; i < text.length; i++) {
                const char = text[i];
                const nextChar = text[i + 1];
                if (char === '"') {
                    if (inQuotes && nextChar === '"') { field += '"'; i++; }
                    else inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) { row.push(field.trim()); field = ''; }
                else if ((char === '\r' || char === '\n') && !inQuotes) {
                    if (field || row.length > 0) {
                        row.push(field.trim());
                        rows.push(row);
                        row = [];
                        field = '';
                    }
                    if (char === '\r' && nextChar === '\n') i++;
                } else field += char;
            }
            if (field || row.length > 0) { row.push(field.trim()); rows.push(row); }
            return rows;
        };

        const rows = parseCSV(csvContent);
        if (rows.length < 2) return res.status(400).json({ error: 'Il file CSV sembra vuoto o non valido' });

        const data = rows.slice(1);
        console.log(`Starting import of ${data.length} rows...`);

        const results = [];
        const errors = [];

        for (const row of data) {
            try {
                if (row.length < 2) continue;

                const nome = row[0] || '';
                const cognome = row[1] || '';
                const tiktok = row[2] || '';
                // Clean and parse follower counts (remove dots/commas if present)
                const tiktokFollowers = Math.round(parseFloat((row[3] || '0').replace(/[\.,]/g, '')));
                const instagram = row[5] || '';
                const instagramFollowers = Math.round(parseFloat((row[6] || '0').replace(/[\.,]/g, '')));
                const billingData = row[8] || '';
                const billingAddress = row[9] || '';
                const shippingAddress = row[10] || '';
                const email = row[11] || `${nome.toLowerCase().replace(/\s/g, '')}.${cognome.toLowerCase().replace(/\s/g, '')}@import.com`;
                const phone = row[12] || '';
                const notes = row[13] || '';

                const ibanMatch = billingData.match(/IT[0-9]{2}[A-Z][0-9]{10}[0-9A-Z]{12}/);
                const vatMatch = billingData.match(/[0-9]{11}/);

                const talentId = `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
                const talent = {
                    id: talentId,
                    firstName: nome,
                    lastName: cognome,
                    stageName: `${nome} ${cognome}`.trim(),
                    email: email,
                    phone: phone,
                    instagram: instagram,
                    instagramFollowers: instagramFollowers,
                    tiktok: tiktok,
                    tiktokFollowers: tiktokFollowers,
                    address: billingAddress || shippingAddress,
                    shippingNotes: shippingAddress,
                    iban: ibanMatch ? ibanMatch[0] : null,
                    vat: vatMatch ? vatMatch[0] : null,
                    taxNotes: billingData,
                    status: 'active',
                    notes: notes,
                    photoUrl: `https://ui-avatars.com/api/?name=${nome}+${cognome}&background=random`
                };

                const created = talentsDB.create(talent);

                const password = Math.random().toString(36).slice(-8);
                const username = `${nome.toLowerCase().replace(/\s/g, '')}.${cognome.toLowerCase().replace(/\s/g, '')}`;
                try {
                    usersDB.create({
                        id: `u-${talentId}`,
                        name: `${nome} ${cognome}`,
                        username: username,
                        email: email,
                        password: password,
                        role: 'talent',
                        talentId: talentId
                    });
                } catch (e: any) {
                    console.warn(`Could not create user for ${email}: ${e.message}`);
                }

                results.push({ talent: created, password });
            } catch (error: any) {
                console.error(`Error importing row:`, row, error);
                errors.push(`Riga ${row[0] || ''} ${row[1] || ''}: ${error.message}`);
            }
        }

        if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);

        res.json({
            success: true,
            imported: results.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error: any) {
        console.error('Import process failed:', error);
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/talents/:id', (req: Request, res: Response) => {
    try {
        const talent = talentsDB.update(req.params.id, req.body);
        if (!talent) {
            return res.status(404).json({ error: 'Talent not found' });
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
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const talent = talentsDB.getById(req.params.id);
        if (!talent) {
            return res.status(404).json({ error: 'Talent not found' });
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

// ============== BRANDS API ==============
app.get('/api/brands', (req: Request, res: Response) => {
    try {
        const brands = brandsDB.getAll();
        res.json(brands);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/brands/:id', (req: Request, res: Response) => {
    try {
        const brand = brandsDB.getById(req.params.id);
        if (!brand) {
            return res.status(404).json({ error: 'Brand not found' });
        }
        res.json(brand);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/brands', (req: Request, res: Response) => {
    try {
        const brand = brandsDB.create({
            id: `brand-${Date.now()}`,
            ...req.body
        });
        res.status(201).json(brand);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/brands/:id', (req: Request, res: Response) => {
    try {
        const brand = brandsDB.update(req.params.id, req.body);
        if (!brand) {
            return res.status(404).json({ error: 'Brand not found' });
        }
        res.json(brand);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/brands/:id', (req: Request, res: Response) => {
    try {
        brandsDB.delete(req.params.id);
        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Brand logo upload
app.post('/api/brands/:id/upload/logo', upload.single('file'), (req: Request, res: Response) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const brand = brandsDB.getById(req.params.id);
        if (!brand) {
            return res.status(404).json({ error: 'Brand not found' });
        }

        const fileUrl = `/uploads/${req.params.type}/${req.file.filename}`;
        brandsDB.update(req.params.id, { logoUrl: fileUrl });

        res.json({ url: fileUrl, success: true });
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
            return res.status(404).json({ error: 'Campaign not found' });
        }

        // Get related data
        const collaborations = collaborationsDB.getByCampaign(req.params.id);
        const incomeItems = incomeDB.getByCampaign(req.params.id);
        const costs = extraCostsDB.getByCampaign(req.params.id);

        res.json({
            ...campaign,
            collaborations,
            income: incomeItems,
            extraCosts: costs
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/campaigns', (req: Request, res: Response) => {
    try {
        const campaignId = `c-${Date.now()}`;
        const campaign = campaignsDB.create({
            id: campaignId,
            ...req.body.campaign
        });

        // If talent is linked, create collaboration and appointment
        if (req.body.linkTalent && req.body.linkTalent.enabled && req.body.linkTalent.talentId) {
            const talent = talentsDB.getById(req.body.linkTalent.talentId);
            if (talent) {
                const totalBudget = Number(req.body.campaign.totalBudget) || 0;
                const agencyFeePercent = Number(req.body.campaign.agencyFeePercent) || 30;
                const talentFee = Math.floor(totalBudget * (1 - agencyFeePercent / 100));
                const collabId = `col-${Date.now()}`;

                collaborationsDB.create({
                    id: collabId,
                    talentId: talent.id,
                    brand: req.body.campaign.brand,
                    campaignId: campaignId,
                    type: req.body.linkTalent.type || 'Shooting + Social Kit',
                    fee: talentFee,
                    status: 'Confermata',
                    paymentStatus: 'Non Saldato',
                    deadline: req.body.campaign.deadline
                });

                const activityDate = req.body.linkTalent.activityDate ? new Date(req.body.linkTalent.activityDate).toISOString() : new Date().toISOString();

                appointmentsDB.create({
                    id: `app-${Date.now()}`,
                    talentId: talent.id,
                    talentName: talent.stageName,
                    brand: req.body.campaign.brand,
                    type: 'Shooting',
                    date: activityDate,
                    status: 'planned',
                    collaborationId: collabId,
                    description: `Shooting per ${req.body.campaign.name}`
                });

                // Create notification for talent
                notificationsDB.create({
                    id: `notif-${Date.now()}`,
                    userId: talent.id,
                    type: 'new_collaboration',
                    title: 'Nuova Collaborazione',
                    message: `Sei stato assegnato alla campagna ${req.body.campaign.name} per ${req.body.campaign.brand}`,
                    link: `/my-calendar`
                });
            }
        }

        // Create income entry
        incomeDB.create({
            id: `inc-${Date.now()}`,
            campaignId: campaignId,
            amount: Number(req.body.campaign.totalBudget) || 0,
            status: 'pending',
            expectedDate: req.body.campaign.deadline
        });

        res.status(201).json(campaign);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/campaigns/:id', (req: Request, res: Response) => {
    try {
        const campaign = campaignsDB.update(req.params.id, req.body);
        if (!campaign) {
            return res.status(404).json({ error: 'Campaign not found' });
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

// ============== COLLABORATIONS API ==============
app.get('/api/collaborations', (req: Request, res: Response) => {
    try {
        const { talentId, campaignId } = req.query;
        let collaborations;

        if (talentId) {
            collaborations = collaborationsDB.getByTalent(talentId as string);
        } else if (campaignId) {
            collaborations = collaborationsDB.getByCampaign(campaignId as string);
        } else {
            collaborations = collaborationsDB.getAll();
        }

        res.json(collaborations);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/collaborations', (req: Request, res: Response) => {
    try {
        const collabId = `col-${Date.now()}`;
        const collab = collaborationsDB.create({
            id: collabId,
            ...req.body.collaboration
        });

        // Create appointments if provided
        if (req.body.appointments && req.body.appointments.length > 0) {
            req.body.appointments.forEach((app: any, index: number) => {
                appointmentsDB.create({
                    id: `app-${Date.now()}-${index}`,
                    ...app,
                    collaborationId: collabId
                });
            });
        }

        res.status(201).json(collab);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/collaborations/:id', (req: Request, res: Response) => {
    try {
        const collab = collaborationsDB.update(req.params.id, req.body);
        if (!collab) {
            return res.status(404).json({ error: 'Collaboration not found' });
        }
        res.json(collab);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/collaborations/:id', (req: Request, res: Response) => {
    try {
        collaborationsDB.delete(req.params.id);
        res.json({ success: true });
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
            return res.status(404).json({ error: 'Appointment not found' });
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
            return res.status(404).json({ error: 'Income not found' });
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
            return res.status(404).json({ error: 'Cost not found' });
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
        const collaborations = collaborationsDB.getAll() as any[];
        const allIncome = incomeDB.getAll() as any[];
        const allCosts = extraCostsDB.getAll() as any[];
        const talents = talentsDB.getAll();

        const fatturato = campaigns.reduce((acc, c) => acc + (c.totalBudget || 0), 0);
        const talentPayouts = collaborations.reduce((acc, c) => acc + (c.fee || 0), 0);
        const totalExtraCosts = allCosts.reduce((acc, c) => acc + (c.amount || 0), 0);
        const utile = fatturato - talentPayouts - totalExtraCosts;

        const incassoRicevuto = allIncome.filter((i: any) => i.status === 'received').reduce((acc: number, i: any) => acc + i.amount, 0);
        const incassoPending = allIncome.filter((i: any) => i.status === 'pending').reduce((acc: number, i: any) => acc + i.amount, 0);

        const collabPaid = collaborations.filter((c: any) => c.paymentStatus === 'Saldato').length;
        const collabUnpaid = collaborations.filter((c: any) => c.paymentStatus === 'Non Saldato').length;

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
            collaborations: {
                total: collaborations.length,
                paid: collabPaid,
                unpaid: collabUnpaid
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

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Advenire API Server running on http://localhost:${PORT}`);
});

export default app;
