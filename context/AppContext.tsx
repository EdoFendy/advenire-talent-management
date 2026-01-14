// Global State Context for Advenire Talent Management
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { api } from '../api';
import { Talent, Campaign, Collaboration, Appointment, ExtraCost, Income, AuthState, Role, Brand, CollaborationStatus, PaymentStatus, AppointmentType } from '../types';

// Initial data for offline/fallback mode
import {
    INITIAL_TALENTS,
    INITIAL_CAMPAIGNS,
    INITIAL_COLLABORATIONS,
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
    type: 'talent' | 'campaign' | 'collaboration';
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
    collaborations: {
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
    brands: Brand[];
    campaigns: Campaign[];
    collaborations: Collaboration[];
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
    importTalentsCSV: (file: File) => Promise<any>;

    // Actions - Brands
    addBrand: (brand: Omit<Brand, 'id'>) => Promise<Brand>;
    updateBrand: (id: string, updates: Partial<Brand>) => Promise<Brand>;
    deleteBrand: (id: string) => Promise<void>;
    uploadBrandLogo: (id: string, file: File) => Promise<string>;

    // Actions - Campaigns
    fetchCampaigns: () => Promise<void>;
    addCampaign: (campaign: any, linkTalent?: any) => Promise<Campaign>;
    updateCampaign: (id: string, updates: Partial<Campaign>) => Promise<Campaign>;
    deleteCampaign: (id: string) => Promise<void>;

    // Actions - Collaborations
    fetchCollaborations: () => Promise<void>;
    addCollaboration: (collab: Omit<Collaboration, 'id'>, appointments?: any[]) => Promise<Collaboration>;
    updateCollaboration: (id: string, updates: Partial<Collaboration>) => Promise<Collaboration>;
    deleteCollaboration: (id: string) => Promise<void>;

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
    const [brands, setBrands] = useState<Brand[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
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
                        const [talentsData, brandsData, campaignsData, collabsData, appsData, incomeData, costsData] = await Promise.all([
                            api.talents.getAll(),
                            api.brands.getAll(),
                            api.campaigns.getAll(),
                            api.collaborations.getAll(),
                            api.appointments.getAll(),
                            api.income.getAll(),
                            api.costs.getAll()
                        ]);

                        setTalents(talentsData);
                        setBrands(brandsData);
                        setCampaigns(campaignsData);
                        setCollaborations(collabsData);
                        setAppointments(appsData);
                        setIncome(incomeData);
                        setExtraCosts(costsData);
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
            // Load from localStorage or use initial data
            const stored = (key: string, def: any) => {
                const s = localStorage.getItem(`advenire_erp_${key}`);
                return s ? JSON.parse(s) : def;
            };

            setTalents(stored('talents', INITIAL_TALENTS));
            setBrands(stored('brands', []));
            setCampaigns(stored('campaigns', INITIAL_CAMPAIGNS));
            setCollaborations(stored('collaborations', INITIAL_COLLABORATIONS));
            setAppointments(stored('appointments', INITIAL_APPOINTMENTS));
            setExtraCosts(stored('extraCosts', INITIAL_EXTRA_COSTS));
            setIncome(stored('income', INITIAL_INCOME));
        };

        loadInitialData();
    }, [auth.user]); // Reload data when user changes

    // Save auth to localStorage
    useEffect(() => {
        localStorage.setItem('advenire_auth', JSON.stringify(auth));
    }, [auth]);

    // Persist to localStorage when offline
    useEffect(() => {
        if (!isOnline) {
            localStorage.setItem('advenire_erp_talents', JSON.stringify(talents));
            localStorage.setItem('advenire_erp_brands', JSON.stringify(brands));
            localStorage.setItem('advenire_erp_campaigns', JSON.stringify(campaigns));
            localStorage.setItem('advenire_erp_collaborations', JSON.stringify(collaborations));
            localStorage.setItem('advenire_erp_appointments', JSON.stringify(appointments));
            localStorage.setItem('advenire_erp_extraCosts', JSON.stringify(extraCosts));
            localStorage.setItem('advenire_erp_income', JSON.stringify(income));
        }
    }, [isOnline, talents, brands, campaigns, collaborations, appointments, extraCosts, income]);

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
            // response is { talent: ..., credentials: ... }
            const createdTalent = response.talent;
            setTalents(prev => [...prev, createdTalent]);
            showToast(`${createdTalent.stageName} aggiunto al roster`, 'success');
            return response; // Return full response
        } else {
            const created = { ...talent, id: `t-${Date.now()}` } as Talent;
            setTalents(prev => [...prev, created]);
            const password = Math.random().toString(36).slice(-8);
            showToast(`${created.stageName} aggiunto (offline)`, 'info');
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

    const importTalentsCSV = useCallback(async (file: File) => {
        if (!isOnline) {
            showToast('Importazione non disponibile offline', 'error');
            return;
        }
        try {
            const response = await api.talents.importCSV(file);
            await fetchTalents();
            showToast(`${response.imported} talent importati con successo`, 'success');
            return response;
        } catch (error: any) {
            showToast(error.message || 'Errore durante l\'importazione', 'error');
            throw error;
        }
    }, [isOnline, fetchTalents, showToast]);

    // ============== BRANDS ACTIONS ==============
    const addBrand = useCallback(async (brand: Omit<Brand, 'id'>) => {
        if (isOnline) {
            const created = await api.brands.create(brand);
            setBrands(prev => [...prev, created]);
            showToast(`${created.name} aggiunto ai brand`, 'success');
            return created;
        } else {
            const created = { ...brand, id: `brand-${Date.now()}` } as Brand;
            setBrands(prev => [...prev, created]);
            showToast(`${created.name} aggiunto (offline)`, 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateBrand = useCallback(async (id: string, updates: Partial<Brand>) => {
        if (isOnline) {
            const updated = await api.brands.update(id, updates);
            setBrands(prev => prev.map(b => b.id === id ? updated : b));
            showToast('Brand aggiornato', 'success');
            return updated;
        } else {
            setBrands(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
            const updated = brands.find(b => b.id === id)!;
            showToast('Brand aggiornato (offline)', 'info');
            return { ...updated, ...updates };
        }
    }, [isOnline, brands, showToast]);

    const deleteBrand = useCallback(async (id: string) => {
        if (isOnline) {
            await api.brands.delete(id);
        }
        setBrands(prev => prev.filter(b => b.id !== id));
        showToast('Brand eliminato', 'success');
    }, [isOnline, showToast]);

    const uploadBrandLogo = useCallback(async (id: string, file: File) => {
        if (!isOnline) {
            showToast('Upload non disponibile offline', 'error');
            throw new Error('Offline');
        }
        const result = await api.brands.uploadLogo(id, file);
        // Refresh brands to get new logo url
        const updated = await api.brands.getById(id);
        setBrands(prev => prev.map(b => b.id === id ? updated : b));
        showToast('Logo caricato con successo', 'success');
        return result.url;
    }, [isOnline, showToast]);

    // ============== CAMPAIGNS ACTIONS ==============
    const fetchCampaigns = useCallback(async () => {
        if (isOnline) {
            const data = await api.campaigns.getAll();
            setCampaigns(data);
        }
    }, [isOnline]);

    const addCampaign = useCallback(async (campaign: any, linkTalent?: any) => {
        if (isOnline) {
            const created = await api.campaigns.create({ campaign, linkTalent });
            await Promise.all([fetchCampaigns(), fetchCollaborations(), fetchAppointments()]);
            showToast(`Campagna "${created.name}" creata`, 'success');
            return created;
        } else {
            const created = { ...campaign, id: `c-${Date.now()}` } as Campaign;
            setCampaigns(prev => [...prev, created]);

            // OFFLINE: Link Talent Logic
            if (linkTalent && linkTalent.enabled && linkTalent.talentId) {
                const talent = talents.find(t => t.id === linkTalent.talentId);
                if (talent) {
                    const collabId = `col-${Date.now()}`;
                    const talentFee = Math.floor(campaign.totalBudget * 0.7); // Mock fee logic

                    const newCollab: Collaboration = {
                        id: collabId,
                        talentId: talent.id,
                        campaignId: created.id,
                        brand: created.brand,
                        type: linkTalent.type,
                        fee: talentFee,
                        status: CollaborationStatus.CONFIRMED,
                        notes: '',
                        paymentStatus: PaymentStatus.UNPAID,
                        paidAmount: 0
                    };
                    setCollaborations(prev => [...prev, newCollab]);

                    // Create Appointment
                    const newApp: Appointment = {
                        id: `app-${Date.now()}`,
                        talentId: talent.id,
                        talentName: talent.stageName,
                        brand: created.brand,
                        type: AppointmentType.SHOOTING,
                        date: linkTalent.activityDate,
                        status: 'planned',
                        collaborationId: collabId,
                        description: `Shooting per ${created.name}`
                    };
                    setAppointments(prev => [...prev, newApp]);
                }
            }

            showToast('Campagna creata (offline)', 'info');
            return created;
        }
    }, [isOnline, showToast, talents]);

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

    // ============== COLLABORATIONS ACTIONS ==============
    const fetchCollaborations = useCallback(async () => {
        if (isOnline) {
            const data = await api.collaborations.getAll();
            setCollaborations(data);
        }
    }, [isOnline]);

    const addCollaboration = useCallback(async (collab: Omit<Collaboration, 'id'>, appointmentData?: any[]) => {
        if (isOnline) {
            const created = await api.collaborations.create({ collaboration: collab, appointments: appointmentData });
            await Promise.all([fetchCollaborations(), fetchAppointments()]);
            showToast('Collaborazione creata', 'success');
            return created;
        } else {
            const created = { ...collab, id: `col-${Date.now()}` } as Collaboration;
            setCollaborations(prev => [...prev, created]);
            if (appointmentData) {
                appointmentData.forEach((app, i) => {
                    setAppointments(prev => [...prev, { ...app, id: `app-${Date.now()}-${i}`, collaborationId: created.id }]);
                });
            }
            showToast('Collaborazione creata (offline)', 'info');
            return created;
        }
    }, [isOnline, showToast]);

    const updateCollaboration = useCallback(async (id: string, updates: Partial<Collaboration>) => {
        if (isOnline) {
            const updated = await api.collaborations.update(id, updates);
            setCollaborations(prev => prev.map(c => c.id === id ? updated : c));
            showToast('Collaborazione aggiornata', 'success');
            return updated;
        } else {
            setCollaborations(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
            const updated = collaborations.find(c => c.id === id)!;
            showToast('Collaborazione aggiornata (offline)', 'info');
            return { ...updated, ...updates };
        }
    }, [isOnline, collaborations, showToast]);

    const deleteCollaboration = useCallback(async (id: string) => {
        if (isOnline) {
            await api.collaborations.delete(id);
        }
        setCollaborations(prev => prev.filter(c => c.id !== id));
        showToast('Collaborazione eliminata', 'success');
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
            // Offline search
            const q = query.toLowerCase();
            const results: SearchResult[] = [
                ...talents.filter(t =>
                    t.stageName.toLowerCase().includes(q) ||
                    t.firstName.toLowerCase().includes(q) ||
                    t.lastName.toLowerCase().includes(q)
                ).map(t => ({
                    type: 'talent' as const,
                    id: t.id,
                    name: t.stageName,
                    subtitle: `${t.firstName} ${t.lastName}`
                })),
                ...campaigns.filter(c =>
                    c.name.toLowerCase().includes(q) ||
                    c.brand.toLowerCase().includes(q)
                ).map(c => ({
                    type: 'campaign' as const,
                    id: c.id,
                    name: c.name,
                    subtitle: c.brand
                }))
            ];
            setSearchResults(results);
            return results;
        }
    }, [isOnline, talents, campaigns]);

    const clearSearchResults = useCallback(() => {
        setSearchResults([]);
    }, []);

    // ============== ANALYTICS ACTIONS ==============
    const fetchAnalytics = useCallback(async () => {
        if (isOnline) {
            const data = await api.analytics.get();
            setAnalytics(data);
        } else {
            // Calculate locally
            const fatturato = campaigns.reduce((acc, c) => acc + c.totalBudget, 0);
            const talentPayouts = collaborations.reduce((acc, c) => acc + c.fee, 0);
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
                collaborations: {
                    total: collaborations.length,
                    paid: collaborations.filter(c => c.paymentStatus === 'Saldato').length,
                    unpaid: collaborations.filter(c => c.paymentStatus === 'Non Saldato').length
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
    }, [isOnline, campaigns, collaborations, extraCosts, income, talents]);

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
            setAuth({ user: { id: `u-${talentId}`, name: t?.stageName || 'Talent', role: 'talent', talentId } });
        } else if (role === 'team') {
            setAuth({ user: { id: 'team-1', name: 'Team Member', role: 'team' } });
        } else if (role === 'finance') {
            setAuth({ user: { id: 'finance-1', name: 'Finance Manager', role: 'finance' } });
        }
        showToast(`⚠️ Ruolo cambiato a ${role} (Dev Mode)`, 'info');
    }, [talents, showToast]);

    const value: AppState = {
        // Data
        talents,
        campaigns,
        collaborations,
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
        importTalentsCSV,

        brands,
        addBrand,
        updateBrand,
        deleteBrand,
        uploadBrandLogo,

        fetchCampaigns,
        addCampaign,
        updateCampaign,
        deleteCampaign,

        fetchCollaborations,
        addCollaboration,
        updateCollaboration,
        deleteCollaboration,

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
    };

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};

export default AppContext;
