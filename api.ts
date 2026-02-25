// API Client for Advenire Talent Management
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic fetch wrapper with error handling
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Network error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
}

// ============== TALENTS API ==============
export const talentsApi = {
    getAll: () => apiRequest<any[]>('/talents'),

    getById: (id: string) => apiRequest<any>(`/talents/${id}`),

    create: (talent: any) =>
        apiRequest<any>('/talents', {
            method: 'POST',
            body: JSON.stringify(talent),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/talents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/talents/${id}`, {
            method: 'DELETE',
        }),

    getCredentials: (id: string) =>
        apiRequest<{ username: string, email: string, password: string }>(`/talents/${id}/credentials`),

    getFinance: (id: string) =>
        apiRequest<any>(`/talents/${id}/finance`),

    uploadFile: async (id: string, type: 'gallery' | 'attachments' | 'photo', file: File, metadata?: any) => {
        const formData = new FormData();
        formData.append('file', file);
        if (metadata) {
            Object.entries(metadata).forEach(([key, value]) => {
                formData.append(key, value as string);
            });
        }

        const response = await fetch(`${API_BASE}/talents/${id}/upload/${type}`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        return response.json();
    },

    importExcel: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/talents/import`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Import failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        return response.json();
    },

    importMapped: (rows: Record<string, string>[]) =>
        apiRequest<any>('/talents/import', {
            method: 'POST',
            body: JSON.stringify({ rows }),
        }),
};

// ============== CLIENTS API ==============
export const clientsApi = {
    getAll: () => apiRequest<any[]>('/clients'),

    getById: (id: string) => apiRequest<any>(`/clients/${id}`),

    create: (client: any) =>
        apiRequest<any>('/clients', {
            method: 'POST',
            body: JSON.stringify(client),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/clients/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/clients/${id}`, {
            method: 'DELETE',
        }),

    getCampaigns: (id: string) =>
        apiRequest<any[]>(`/clients/${id}/campaigns`),
};

// ============== CAMPAIGNS API ==============
export const campaignsApi = {
    getAll: () => apiRequest<any[]>('/campaigns'),

    getById: (id: string) => apiRequest<any>(`/campaigns/${id}`),

    create: (data: any) =>
        apiRequest<any>('/campaigns', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/campaigns/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/campaigns/${id}`, {
            method: 'DELETE',
        }),
};

// ============== CAMPAIGN TALENTS API ==============
export const campaignTalentsApi = {
    getAll: (filters?: { campaignId?: string; talentId?: string }) => {
        const params = new URLSearchParams();
        if (filters?.campaignId) params.set('campaignId', filters.campaignId);
        if (filters?.talentId) params.set('talentId', filters.talentId);
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest<any[]>(`/campaign-talents${query}`);
    },

    create: (data: any) =>
        apiRequest<any>('/campaign-talents', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/campaign-talents/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/campaign-talents/${id}`, {
            method: 'DELETE',
        }),
};

// ============== TASKS API ==============
export const tasksApi = {
    getAll: (filters?: { status?: string; priority?: string; due_date?: string; due_date_from?: string; due_date_to?: string; related_type?: string }) => {
        const params = new URLSearchParams();
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.set(key, value);
            });
        }
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest<any[]>(`/tasks${query}`);
    },

    getById: (id: string) => apiRequest<any>(`/tasks/${id}`),

    create: (task: any) =>
        apiRequest<any>('/tasks', {
            method: 'POST',
            body: JSON.stringify(task),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/tasks/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/tasks/${id}`, {
            method: 'DELETE',
        }),
};

// ============== HOME NOTES API ==============
export const homeNotesApi = {
    get: () => apiRequest<any>('/home-notes'),

    update: (noteText: string) =>
        apiRequest<any>('/home-notes', {
            method: 'PUT',
            body: JSON.stringify({ note_text: noteText }),
        }),
};

// ============== APPOINTMENTS API ==============
export const appointmentsApi = {
    getAll: (talentId?: string) => {
        const query = talentId ? `?talentId=${talentId}` : '';
        return apiRequest<any[]>(`/appointments${query}`);
    },

    create: (appointment: any) =>
        apiRequest<any>('/appointments', {
            method: 'POST',
            body: JSON.stringify(appointment),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/appointments/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/appointments/${id}`, {
            method: 'DELETE',
        }),
};

// ============== INCOME API ==============
export const incomeApi = {
    getAll: (campaignId?: string) => {
        const query = campaignId ? `?campaignId=${campaignId}` : '';
        return apiRequest<any[]>(`/income${query}`);
    },

    create: (income: any) =>
        apiRequest<any>('/income', {
            method: 'POST',
            body: JSON.stringify(income),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/income/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/income/${id}`, {
            method: 'DELETE',
        }),
};

// ============== EXTRA COSTS API ==============
export const costsApi = {
    getAll: (campaignId?: string) => {
        const query = campaignId ? `?campaignId=${campaignId}` : '';
        return apiRequest<any[]>(`/costs${query}`);
    },

    create: (cost: any) =>
        apiRequest<any>('/costs', {
            method: 'POST',
            body: JSON.stringify(cost),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/costs/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/costs/${id}`, {
            method: 'DELETE',
        }),
};

// ============== NOTIFICATIONS API ==============
export const notificationsApi = {
    getAll: (userId?: string, unreadOnly?: boolean) => {
        const params = new URLSearchParams();
        if (userId) params.set('userId', userId);
        if (unreadOnly) params.set('unreadOnly', 'true');
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest<any[]>(`/notifications${query}`);
    },

    markAsRead: (id: string) =>
        apiRequest<{ success: boolean }>(`/notifications/${id}/read`, {
            method: 'PUT',
        }),

    markAllAsRead: (userId?: string) => {
        const query = userId ? `?userId=${userId}` : '';
        return apiRequest<{ success: boolean }>(`/notifications/read-all${query}`, {
            method: 'PUT',
        });
    },
};

// ============== QUOTES API ==============
export const quotesApi = {
    getAll: (filters?: { client_id?: string; stato?: string }) => {
        const params = new URLSearchParams();
        if (filters?.client_id) params.set('client_id', filters.client_id);
        if (filters?.stato) params.set('stato', filters.stato);
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest<any[]>(`/quotes${query}`);
    },

    getById: (id: string) => apiRequest<any>(`/quotes/${id}`),

    create: (data: any) =>
        apiRequest<any>('/quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/quotes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/quotes/${id}`, {
            method: 'DELETE',
        }),
};

// ============== SEARCH API ==============
export const searchApi = {
    global: (query: string) => apiRequest<any[]>(`/search?q=${encodeURIComponent(query)}`),
};

// ============== ANALYTICS API ==============
export const analyticsApi = {
    get: () => apiRequest<any>('/analytics'),
};

// Export all APIs
export const api = {
    talents: talentsApi,
    clients: clientsApi,
    campaigns: campaignsApi,
    campaignTalents: campaignTalentsApi,
    tasks: tasksApi,
    homeNotes: homeNotesApi,
    appointments: appointmentsApi,
    income: incomeApi,
    costs: costsApi,
    quotes: quotesApi,
    notifications: notificationsApi,
    search: searchApi,
    analytics: analyticsApi,
};

export default api;
