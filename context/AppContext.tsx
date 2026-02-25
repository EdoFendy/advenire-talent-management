// Global State Context for Advenire Talent Management
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../api';
import { Talent, Campaign, CampaignTalent, Appointment, ExtraCost, Income, AuthState, Role, Client, Task, HomeNote, Quote, AppointmentType } from '../types';

// Initial data for offline/fallback mode
import {
    INITIAL_TALENTS,
    INITIAL_CAMPAIGNS,
    INITIAL_APPOINTMENTS,
    INITIAL_EXTRA_COSTS,
    INITIAL_INCOME
} from '../store';

interface Notification {
    id: string;
    type: string;
    title: string;
    message?: string;
    read: boolean;
    link?: string;
    createdAt: string;
}

interface SearchResult {
    type: 'talent' | 'campaign' | 'client';
    id: string;
    name: string;
    subtitle: string;
}

interface Analytics {
    totals: {
        fatturato: number;
        talentPayouts: number;
        extraCosts: number;
        utile: number;
        marginPercentage: string | number;
    };
    income: {
        received: number;
        pending: number;
    };
    campaignTalents: {
        total: number;
        paid: number;
        unpaid: number;
    };
    talents: {
        total: number;
        active: number;
    };
    campaigns: {
        total: number;
        active: number;
        closed: number;
    };
}

interface AppState {
    // Data
    talents: Talent[];
    clients: Client[];
    campaigns: Campaign[];
    campaignTalents: CampaignTalent[];
    tasks: Task[];
    homeNote: HomeNote | null;
    appointments: Appointment[];
    extraCosts: ExtraCost[];
    income: Income[];
    notifications: Notification[];
    analytics: Analytics | null;

    // Auth
    auth: AuthState;

    // UI State
    isLoading: boolean;
    isOnline: boolean;
    searchResults: SearchResult[];
    toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];

    // Actions - Talents
    fetchTalents: () => Promise<void>;
    addTalent: (talent: Omit<Talent, 'id'>) => Promise<any>;
    updateTalent: (id: string, updates: Partial<Talent>) => Promise<Talent>;
    deleteTalent: (id: string) => Promise<void>;
    uploadTalentFile: (id: string, type: 'gallery' | 'attachments' | 'photo', file: File, metadata?: any) => Promise<string>;

    // Actions - Clients
    fetchClients: () => Promise<void>;
    addClient: (client: Omit<Client, 'id'>) => Promise<Client>;
    updateClient: (id: string, updates: Partial<Client>) => Promise<Client>;
    deleteClient: (id: string) => Promise<void>;

    // Actions - Campaigns
    fetchCampaigns: () => Promise<void>;
    addCampaign: (data: any) => Promise<Campaign>;
    updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<Campaign>;
    deleteCampaign: (id: string) => Promise<void>;

    // Actions - Campaign Talents
    fetchCampaignTalents: () => Promise<void>;
    addCampaignTalent: (ct: Omit<CampaignTalent, 'id'>) => Promise<CampaignTalent>;
    updateCampaignTalent: (id: string, updates: Partial<CampaignTalent>) => Promise<CampaignTalent>;
    deleteCampaignTalent: (id: string) => Promise<void>;

    // Actions - Tasks
    fetchTasks: () => Promise<void>;
    addTask: (task: Omit<Task, 'id'>) => Promise<Task>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<Task>;
    deleteTask: (id: string) => Promise<void>;

    // Actions - Home Notes
    fetchHomeNote: () => Promise<void>;
    updateHomeNote: (noteText: string) => Promise<void>;

    // Actions - Quotes
    quotes: Quote[];
    fetchQuotes: () => Promise<void>;
    addQuote: (quote: Omit<Quote, 'id'>) => Promise<Quote>;
    updateQuote: (id: string, updates: Partial<Quote>) => Promise<Quote>;
    deleteQuote: (id: string) => Promise<void>;

    // Actions - Appointments
    fetchAppointments: () => Promise<void>;
    addAppointment: (app: Omit<Appointment, 'id'>) => Promise<Appointment>;
    updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<Appointment>;
    deleteAppointment: (id: string) => Promise<void>;

    // Actions - Finance
    fetchFinanceData: () => Promise<void>;
    addIncome: (income: Omit<Income, 'id'>) => Promise<Income>;
    updateIncome: (id: string, updates: Partial<Income>) => Promise<Income>;
    deleteIncome: (id: string) => Promise<void>;
    addExtraCost: (cost: Omit<ExtraCost, 'id'>) => Promise<ExtraCost>;
    updateExtraCost: (id: string, updates: Partial<ExtraCost>) => Promise<ExtraCost>;
    deleteExtraCost: (id: string) => Promise<void>;

    // Actions - Notifications
    fetchNotifications: () => Promise<void>;
    markNotificationAsRead: (id: string) => Promise<void>;
    markAllNotificationsAsRead: () => Promise<void>;

    // Actions - Search
    globalSearch: (query: string) => Promise<SearchResult[]>;
    clearSearchResults: () => void;

    // Actions - Analytics
    fetchAnalytics: () => Promise<void>;

    // Actions - Auth
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    switchRole: (role: Role, talentId?: string) => void;

    // Actions - UI
    showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
    dismissToast: (id: string) => void;

    // Legacy compatibility aliases (used by pages until rewrite)
    updateCollaboration: (id: string, updates: any) => Promise<any>;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

interface AppProviderProps {
    children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
    // Data State
    const [talents, setTalents] = useState<Talent[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [campaignTalents, setCampaignTalents] = useState<CampaignTalent[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [homeNote, setHomeNote] = useState<HomeNote | null>(null);
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [extraCosts, setExtraCosts] = useState<ExtraCost[]>([]);
    const [income, setIncome] = useState<Income[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);

    // Auth State
    const [auth, setAuth] = useState<AuthState>(() => {
        const stored = localStorage.getItem('advenire_auth');
        return stored ? JSON.parse(stored) : { user: null };
    });

    // UI State
    const [isLoading, setIsLoading] = useState(true);
    const [isOnline, setIsOnline] = useState(true);
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

    // Toast helper
    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = `toast-${Date.now()}`;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    // Check online status and load initial data
    useEffect(() => {
        const checkOnline = async () => {
            try {
                const response = await fetch('http://localhost:3001/api/health');
                setIsOnline(response.ok);
                return response.ok;
            } catch {
                setIsOnline(false);
                return false;
            }
        };

        const loadInitialData = async () => {
            setIsLoading(true);
            const online = await checkOnline();

            if (online) {
                if (auth.user) {
                    try {
                        const [talentsData, clientsData, campaignsData, ctData, tasksData, appsData, incomeData, costsData, quotesData] = await Promise.all([
                            api.talents.getAll(),
                            api.clients.getAll(),
                            api.campaigns.getAll(),
                            api.campaignTalents.getAll(),
                            api.tasks.getAll(),
                            api.appointments.getAll(),
                            api.income.getAll(),
                            api.costs.getAll(),
                            api.quotes.getAll()
                        ]);

                        setTalents(talentsData);
                        setClients(clientsData);
                        setCampaigns(campaignsData);
                        setCampaignTalents(ctData);
                        setTasks(tasksData);
                        setAppointments(appsData);
                        setIncome(incomeData);
                        setExtraCosts(costsData);
                        setQuotes(quotesData);

                        // Load home note
                        try {
                            const noteData = await api.homeNotes.get();
                            setHomeNote(noteData);
                        } catch { /* ignore */ }
                    } catch (error) {
                        console.error('Failed to load from API, using fallback:', error);
                        loadFallbackData();
                    }
                }
            } else {
                loadFallbackData();
            }

            setIsLoading(false);
        };

        const loadFallbackData = () => {
            const stored = (key: string, def: any) => {
                const s = localStorage.getItem(`advenire_erp_${key}`);
                return s ? JSON.parse(s) : def;
            };

            setTalents(stored('talents', INITIAL_TALENTS));
            setClients(stored('clients', []));
            setCampaigns(stored('campaigns', INITIAL_CAMPAIGNS));
            setCampaignTalents(stored('campaignTalents', []));
            setTasks(stored('tasks', []));
            setAppointments(stored('appointments', INITIAL_APPOINTMENTS));
            setExtraCosts(stored('extraCosts', INITIAL_EXTRA_COSTS));
            setIncome(stored('income', INITIAL_INCOME));
        };

        loadInitialData();
    }, [auth.user]);

    // Save auth to localStorage
    useEffect(() => {
        localStorage.setItem('advenire_auth', JSON.stringify(auth));
    }, [auth]);

    // Persist to localStorage when offline
    useEffect(() => {
        if (!isOnline) {
            localStorage.setItem('advenire_erp_talents', JSON.stringify(talents));
            localStorage.setItem('advenire_erp_clients', JSON.stringify(clients));
            localStorage.setItem('advenire_erp_campaigns', JSON.stringify(campaigns));
            localStorage.setItem('advenire_erp_campaignTalents', JSON.stringify(campaignTalents));
            localStorage.setItem('advenire_erp_tasks', JSON.stringify(tasks));
            localStorage.setItem('advenire_erp_appointments', JSON.stringify(appointments));
            localStorage.setItem('advenire_erp_extraCosts', JSON.stringify(extraCosts));
            localStorage.setItem('advenire_erp_income', JSON.stringify(income));
        }
    }, [isOnline, talents, clients, campaigns, campaignTalents, tasks, appointments, extraCosts, income]);

    // ============== TALENTS ACTIONS ==============
    const fetchTalents = useCallback(async () => {
        if (isOnline) {
            const data = await api.talents.getAll();
            setTalents(data);
        }
    }, [isOnline]);

    const addTalent = useCallback(async (talent: Omit<Talent, 'id'>) => {
        if (isOnline) {
            const response = await api.talents.create(talent);
            const createdTalent = response.talent;
            setTalents(prev => [...prev, createdTalent]);
            showToast(`${createdTalent.firstName} ${createdTalent.lastName} aggiunto al roster`, 'success');
            return response;
        } else {
            const created = { ...talent, id: `t-${Date.now()}` } as Talent;
            setTalents(prev => [...prev, created]);
            const password = Math.random().toString(36).slice(-8);
            showToast(`${created.firstName} ${created.lastName} aggiunto (offline)`, 'info');
            return { talent: created, credentials: { email: created.email, password } };
        }
    }, [isOnline, showToast]);

    const updateTalent = useCallback(async (id: string, updates: Partial<Talent>) => {
        if (isOnline) {
            const updated = await api.talents.update(id, updates);
            setTalents(prev => prev.map(t => t.id === id ? updated : t));
            showToast('Profilo aggiornato', 'success');
            return updated;
        } else {
            setTalents(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
            const updated = talents.find(t => t.id === id)!;
            showToast('Profilo aggiornato (offline)', 'info');
            return { ...updated, ...updates };
        }
    }, [isOnline, talents, showToast]);

    const deleteTalent = useCallback(async (id: string) => {
        if (isOnline) {
            await api.talents.delete(id);
        }
        setTalents(prev => prev.filter(t => t.id !== id));
        showToast('Talent rimosso dal roster', 'success');
    }, [isOnline, showToast]);

    const uploadTalentFile = useCallback(async (id: string, type: 'gallery' | 'attachments' | 'photo', file: File, metadata?: any) => {
        if (!isOnline) {
            showToast('Upload non disponibile offline', 'error');
            throw new Error('Offline');
        }
        const result = await api.talents.uploadFile(id, type, file, metadata);
        await fetchTalents();
        showToast('File caricato con successo', 'success');
        return result.url;
    }, [isOnline, fetchTalents, showToast]);

    // ============== CLIENTS ACTIONS ==============
    const fetchClients = useCallback(async () => {
        if (isOnline) {
            const data = await api.clients.getAll();
            setClients(data);
        }
    }, [isOnline]);

    const addClient = useCallback(async (client: Omit<Client, 'id'>) => {
        if (isOnline) {
            const created = await api.clients.create(client);
            setClients(prev => [...prev, created]);
            showToast(`${created.ragione_sociale} aggiunto ai clienti`, 'success');
            return created;
        } else {
            const created = { ...client, id: `client-${Date.now()}` } as Client;
            setClients(prev => [...prev, created]);
            showToast(`${created.ragione_sociale} aggiunto (offline)`, 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateClient = useCallback(async (id: string, updates: Partial<Client>) => {
        if (isOnline) {
            const updated = await api.clients.update(id, updates);
            setClients(prev => prev.map(c => c.id === id ? updated : c));
            showToast('Cliente aggiornato', 'success');
            return updated;
        } else {
            setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            const updated = clients.find(c => c.id === id)!;
            showToast('Cliente aggiornato (offline)', 'info');
            return { ...updated, ...updates };
        }
    }, [isOnline, clients, showToast]);

    const deleteClient = useCallback(async (id: string) => {
        if (isOnline) {
            await api.clients.delete(id);
        }
        setClients(prev => prev.filter(c => c.id !== id));
        showToast('Cliente eliminato', 'success');
    }, [isOnline, showToast]);

    // ============== CAMPAIGNS ACTIONS ==============
    const fetchCampaigns = useCallback(async () => {
        if (isOnline) {
            const data = await api.campaigns.getAll();
            setCampaigns(data);
        }
    }, [isOnline]);

    const addCampaign = useCallback(async (data: any) => {
        if (isOnline) {
            const created = await api.campaigns.create(data);
            await Promise.all([fetchCampaigns(), fetchCampaignTalents(), fetchAppointments()]);
            showToast(`Campagna "${created.name}" creata`, 'success');
            return created;
        } else {
            const campaignData = data.campaign || data;
            const created = { ...campaignData, id: `c-${Date.now()}` } as Campaign;
            setCampaigns(prev => [...prev, created]);
            showToast('Campagna creata (offline)', 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateCampaign = useCallback(async (id: string, updates: Partial<Campaign>) => {
        if (isOnline) {
            const updated = await api.campaigns.update(id, updates);
            setCampaigns(prev => prev.map(c => c.id === id ? updated : c));
            showToast('Campagna aggiornata', 'success');
            return updated;
        } else {
            setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            const updated = campaigns.find(c => c.id === id)!;
            showToast('Campagna aggiornata (offline)', 'info');
            return { ...updated, ...updates };
        }
    }, [isOnline, campaigns, showToast]);

    const deleteCampaign = useCallback(async (id: string) => {
        if (isOnline) {
            await api.campaigns.delete(id);
        }
        setCampaigns(prev => prev.filter(c => c.id !== id));
        showToast('Campagna eliminata', 'success');
    }, [isOnline, showToast]);

    // ============== CAMPAIGN TALENTS ACTIONS ==============
    const fetchCampaignTalents = useCallback(async () => {
        if (isOnline) {
            const data = await api.campaignTalents.getAll();
            setCampaignTalents(data);
        }
    }, [isOnline]);

    const addCampaignTalent = useCallback(async (ct: Omit<CampaignTalent, 'id'>) => {
        if (isOnline) {
            const created = await api.campaignTalents.create(ct);
            setCampaignTalents(prev => [...prev, created]);
            showToast('Talent assegnato alla campagna', 'success');
            return created;
        } else {
            const created = { ...ct, id: `ct-${Date.now()}` } as CampaignTalent;
            setCampaignTalents(prev => [...prev, created]);
            showToast('Talent assegnato (offline)', 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateCampaignTalent = useCallback(async (id: string, updates: Partial<CampaignTalent>) => {
        if (isOnline) {
            const updated = await api.campaignTalents.update(id, updates);
            setCampaignTalents(prev => prev.map(ct => ct.id === id ? updated : ct));
            showToast('Aggiornamento salvato', 'success');
            return updated;
        } else {
            setCampaignTalents(prev => prev.map(ct => ct.id === id ? { ...ct, ...updates } : ct));
            const updated = campaignTalents.find(ct => ct.id === id)!;
            return { ...updated, ...updates };
        }
    }, [isOnline, campaignTalents, showToast]);

    const deleteCampaignTalent = useCallback(async (id: string) => {
        if (isOnline) {
            await api.campaignTalents.delete(id);
        }
        setCampaignTalents(prev => prev.filter(ct => ct.id !== id));
        showToast('Talent rimosso dalla campagna', 'success');
    }, [isOnline, showToast]);

    // ============== TASKS ACTIONS ==============
    const fetchTasks = useCallback(async () => {
        if (isOnline) {
            const data = await api.tasks.getAll();
            setTasks(data);
        }
    }, [isOnline]);

    const addTask = useCallback(async (task: Omit<Task, 'id'>) => {
        if (isOnline) {
            const created = await api.tasks.create(task);
            setTasks(prev => [...prev, created]);
            return created;
        } else {
            const created = { ...task, id: `task-${Date.now()}` } as Task;
            setTasks(prev => [...prev, created]);
            return created;
        }
    }, [isOnline]);

    const updateTask = useCallback(async (id: string, updates: Partial<Task>) => {
        if (isOnline) {
            const updated = await api.tasks.update(id, updates);
            setTasks(prev => prev.map(t => t.id === id ? updated : t));
            return updated;
        } else {
            setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
            const updated = tasks.find(t => t.id === id)!;
            return { ...updated, ...updates };
        }
    }, [isOnline, tasks]);

    const deleteTask = useCallback(async (id: string) => {
        if (isOnline) {
            await api.tasks.delete(id);
        }
        setTasks(prev => prev.filter(t => t.id !== id));
    }, [isOnline]);

    // ============== HOME NOTES ACTIONS ==============
    const fetchHomeNote = useCallback(async () => {
        if (isOnline) {
            const data = await api.homeNotes.get();
            setHomeNote(data);
        }
    }, [isOnline]);

    const updateHomeNote = useCallback(async (noteText: string) => {
        if (isOnline) {
            const updated = await api.homeNotes.update(noteText);
            setHomeNote(updated);
        } else {
            setHomeNote(prev => prev ? { ...prev, note_text: noteText } : { id: 'home-note-1', note_text: noteText, updated_at: new Date().toISOString() });
        }
    }, [isOnline]);

    // ============== QUOTES ACTIONS ==============
    const fetchQuotes = useCallback(async () => {
        if (isOnline) {
            const data = await api.quotes.getAll();
            setQuotes(data);
        }
    }, [isOnline]);

    const addQuote = useCallback(async (quote: Omit<Quote, 'id'>) => {
        if (isOnline) {
            const created = await api.quotes.create(quote);
            setQuotes(prev => [created, ...prev]);
            showToast('Preventivo creato', 'success');
            return created;
        } else {
            const created = { ...quote, id: `quote-${Date.now()}` } as Quote;
            setQuotes(prev => [created, ...prev]);
            showToast('Preventivo creato (offline)', 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateQuote = useCallback(async (id: string, updates: Partial<Quote>) => {
        if (isOnline) {
            const updated = await api.quotes.update(id, updates);
            setQuotes(prev => prev.map(q => q.id === id ? updated : q));
            showToast('Preventivo aggiornato', 'success');
            return updated;
        } else {
            setQuotes(prev => prev.map(q => q.id === id ? { ...q, ...updates } : q));
            const updated = quotes.find(q => q.id === id)!;
            return { ...updated, ...updates };
        }
    }, [isOnline, quotes, showToast]);

    const deleteQuote = useCallback(async (id: string) => {
        if (isOnline) {
            await api.quotes.delete(id);
        }
        setQuotes(prev => prev.filter(q => q.id !== id));
        showToast('Preventivo eliminato', 'success');
    }, [isOnline, showToast]);

    // ============== APPOINTMENTS ACTIONS ==============
    const fetchAppointments = useCallback(async () => {
        if (isOnline) {
            const data = await api.appointments.getAll();
            setAppointments(data);
        }
    }, [isOnline]);

    const addAppointment = useCallback(async (app: Omit<Appointment, 'id'>) => {
        if (isOnline) {
            const created = await api.appointments.create(app);
            setAppointments(prev => [...prev, created]);
            showToast('Appuntamento aggiunto', 'success');
            return created;
        } else {
            const created = { ...app, id: `app-${Date.now()}` } as Appointment;
            setAppointments(prev => [...prev, created]);
            showToast('Appuntamento aggiunto (offline)', 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateAppointment = useCallback(async (id: string, updates: Partial<Appointment>) => {
        if (isOnline) {
            const updated = await api.appointments.update(id, updates);
            setAppointments(prev => prev.map(a => a.id === id ? updated : a));
            showToast('Appuntamento aggiornato', 'success');
            return updated;
        } else {
            setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
            const updated = appointments.find(a => a.id === id)!;
            showToast('Appuntamento aggiornato (offline)', 'info');
            return { ...updated, ...updates };
        }
    }, [isOnline, appointments, showToast]);

    const deleteAppointment = useCallback(async (id: string) => {
        if (isOnline) {
            await api.appointments.delete(id);
        }
        setAppointments(prev => prev.filter(a => a.id !== id));
        showToast('Appuntamento eliminato', 'success');
    }, [isOnline, showToast]);

    // ============== FINANCE ACTIONS ==============
    const fetchFinanceData = useCallback(async () => {
        if (isOnline) {
            const [incomeData, costsData] = await Promise.all([
                api.income.getAll(),
                api.costs.getAll()
            ]);
            setIncome(incomeData);
            setExtraCosts(costsData);
        }
    }, [isOnline]);

    const addIncome = useCallback(async (inc: Omit<Income, 'id'>) => {
        if (isOnline) {
            const created = await api.income.create(inc);
            setIncome(prev => [...prev, created]);
            showToast('Entrata registrata', 'success');
            return created;
        } else {
            const created = { ...inc, id: `inc-${Date.now()}` } as Income;
            setIncome(prev => [...prev, created]);
            showToast('Entrata registrata (offline)', 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateIncome = useCallback(async (id: string, updates: Partial<Income>) => {
        if (isOnline) {
            const updated = await api.income.update(id, updates);
            setIncome(prev => prev.map(i => i.id === id ? updated : i));
            showToast('Entrata aggiornata', 'success');
            return updated;
        } else {
            setIncome(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
            const updated = income.find(i => i.id === id)!;
            showToast('Entrata aggiornata (offline)', 'info');
            return { ...updated, ...updates };
        }
    }, [isOnline, income, showToast]);

    const deleteIncome = useCallback(async (id: string) => {
        if (isOnline) {
            await api.income.delete(id);
        }
        setIncome(prev => prev.filter(i => i.id !== id));
        showToast('Entrata eliminata', 'success');
    }, [isOnline, showToast]);

    const addExtraCost = useCallback(async (cost: Omit<ExtraCost, 'id'>) => {
        if (isOnline) {
            const created = await api.costs.create(cost);
            setExtraCosts(prev => [...prev, created]);
            showToast('Costo registrato', 'success');
            return created;
        } else {
            const created = { ...cost, id: `cost-${Date.now()}` } as ExtraCost;
            setExtraCosts(prev => [...prev, created]);
            showToast('Costo registrato (offline)', 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateExtraCost = useCallback(async (id: string, updates: Partial<ExtraCost>) => {
        if (isOnline) {
            const updated = await api.costs.update(id, updates);
            setExtraCosts(prev => prev.map(c => c.id === id ? updated : c));
            showToast('Costo aggiornato', 'success');
            return updated;
        } else {
            setExtraCosts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            const updated = extraCosts.find(c => c.id === id)!;
            showToast('Costo aggiornato (offline)', 'info');
            return { ...updated, ...updates };
        }
    }, [isOnline, extraCosts, showToast]);

    const deleteExtraCost = useCallback(async (id: string) => {
        if (isOnline) {
            await api.costs.delete(id);
        }
        setExtraCosts(prev => prev.filter(c => c.id !== id));
        showToast('Costo eliminato', 'success');
    }, [isOnline, showToast]);

    // ============== NOTIFICATIONS ACTIONS ==============
    const fetchNotifications = useCallback(async () => {
        if (isOnline) {
            const data = await api.notifications.getAll(auth.user?.id);
            setNotifications(data);
        }
    }, [isOnline, auth.user?.id]);

    const markNotificationAsRead = useCallback(async (id: string) => {
        if (isOnline) {
            await api.notifications.markAsRead(id);
        }
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }, [isOnline]);

    const markAllNotificationsAsRead = useCallback(async () => {
        if (isOnline) {
            await api.notifications.markAllAsRead(auth.user?.id);
        }
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    }, [isOnline, auth.user?.id]);

    // ============== SEARCH ACTIONS ==============
    const globalSearch = useCallback(async (query: string) => {
        if (query.length < 2) {
            setSearchResults([]);
            return [];
        }

        if (isOnline) {
            const results = await api.search.global(query);
            setSearchResults(results);
            return results;
        } else {
            const q = query.toLowerCase();
            const results: SearchResult[] = [
                ...talents.filter(t =>
                    t.firstName.toLowerCase().includes(q) ||
                    t.lastName.toLowerCase().includes(q) ||
                    (t.stageName && t.stageName.toLowerCase().includes(q))
                ).map(t => ({
                    type: 'talent' as const,
                    id: t.id,
                    name: `${t.firstName} ${t.lastName}`,
                    subtitle: t.email
                })),
                ...campaigns.filter(c =>
                    c.name.toLowerCase().includes(q)
                ).map(c => ({
                    type: 'campaign' as const,
                    id: c.id,
                    name: c.name,
                    subtitle: c.tipo || ''
                })),
                ...clients.filter(c =>
                    c.ragione_sociale.toLowerCase().includes(q) ||
                    (c.referente && c.referente.toLowerCase().includes(q))
                ).map(c => ({
                    type: 'client' as const,
                    id: c.id,
                    name: c.ragione_sociale,
                    subtitle: c.referente || ''
                }))
            ];
            setSearchResults(results);
            return results;
        }
    }, [isOnline, talents, campaigns, clients]);

    const clearSearchResults = useCallback(() => {
        setSearchResults([]);
    }, []);

    // ============== ANALYTICS ACTIONS ==============
    const fetchAnalytics = useCallback(async () => {
        if (isOnline) {
            const data = await api.analytics.get();
            setAnalytics(data);
        } else {
            const fatturato = campaigns.reduce((acc, c) => acc + c.totalBudget, 0);
            const talentPayouts = campaignTalents.reduce((acc, ct) => acc + ct.compenso_lordo, 0);
            const totalExtraCosts = extraCosts.reduce((acc, c) => acc + c.amount, 0);
            const utile = fatturato - talentPayouts - totalExtraCosts;

            setAnalytics({
                totals: {
                    fatturato,
                    talentPayouts,
                    extraCosts: totalExtraCosts,
                    utile,
                    marginPercentage: fatturato > 0 ? ((utile / fatturato) * 100).toFixed(1) : 0
                },
                income: {
                    received: income.filter(i => i.status === 'received').reduce((a, i) => a + i.amount, 0),
                    pending: income.filter(i => i.status === 'pending').reduce((a, i) => a + i.amount, 0)
                },
                campaignTalents: {
                    total: campaignTalents.length,
                    paid: campaignTalents.filter(ct => ct.stato === 'pagato').length,
                    unpaid: campaignTalents.filter(ct => ct.stato !== 'pagato').length
                },
                talents: {
                    total: talents.length,
                    active: talents.filter(t => t.status === 'active').length
                },
                campaigns: {
                    total: campaigns.length,
                    active: campaigns.filter(c => c.status === 'Attiva').length,
                    closed: campaigns.filter(c => c.status === 'Chiusa').length
                }
            });
        }
    }, [isOnline, campaigns, campaignTalents, extraCosts, income, talents]);

    // ============== AUTH ACTIONS ==============
    const login = useCallback(async (identifier: string, password: string) => {
        if (!isOnline) {
            throw new Error('Applicazione offline');
        }

        const response = await fetch('http://localhost:3001/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login fallito');
        }

        setAuth({ user: data.user });
        showToast(`Benvenuto, ${data.user.name}`, 'success');
    }, [isOnline, showToast]);

    const logout = useCallback(() => {
        setAuth({ user: null });
        localStorage.removeItem('advenire_auth');
        showToast('Logout effettuato', 'info');
    }, [showToast]);

    const switchRole = useCallback((role: Role, talentId?: string) => {
        if (role === 'admin') {
            setAuth({ user: { id: 'admin-1', name: 'Advenire Admin', role: 'admin' } });
        } else if (role === 'talent' && talentId) {
            const t = talents.find(x => x.id === talentId);
            setAuth({ user: { id: `u-${talentId}`, name: t ? `${t.firstName} ${t.lastName}` : 'Talent', role: 'talent', talentId } });
        } else if (role === 'team') {
            setAuth({ user: { id: 'team-1', name: 'Team Member', role: 'team' } });
        } else if (role === 'finance') {
            setAuth({ user: { id: 'finance-1', name: 'Finance Manager', role: 'finance' } });
        }
        showToast(`Ruolo cambiato a ${role} (Dev Mode)`, 'info');
    }, [talents, showToast]);

    const value: AppState = {
        // Data
        talents,
        clients,
        campaigns,
        campaignTalents,
        tasks,
        homeNote,
        appointments,
        extraCosts,
        income,
        notifications,
        analytics,

        // Auth
        auth,
        login,
        logout,

        // UI State
        isLoading,
        isOnline,
        searchResults,
        toasts,

        // Actions
        fetchTalents,
        addTalent,
        updateTalent,
        deleteTalent,
        uploadTalentFile,

        fetchClients,
        addClient,
        updateClient,
        deleteClient,

        fetchCampaigns,
        addCampaign,
        updateCampaign,
        deleteCampaign,

        fetchCampaignTalents,
        addCampaignTalent,
        updateCampaignTalent,
        deleteCampaignTalent,

        fetchTasks,
        addTask,
        updateTask,
        deleteTask,

        quotes,
        fetchQuotes,
        addQuote,
        updateQuote,
        deleteQuote,

        fetchHomeNote,
        updateHomeNote,

        fetchAppointments,
        addAppointment,
        updateAppointment,
        deleteAppointment,

        fetchFinanceData,
        addIncome,
        updateIncome,
        deleteIncome,
        addExtraCost,
        updateExtraCost,
        deleteExtraCost,

        fetchNotifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,

        globalSearch,
        clearSearchResults,

        fetchAnalytics,

        switchRole,

        showToast,
        dismissToast,

        // Legacy compatibility
        updateCollaboration: updateCampaignTalent as any,
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export default AppContext;
