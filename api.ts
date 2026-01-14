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

    importCSV: async (file: File) => {
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
};

// ============== BRANDS API ==============
export const brandsApi = {
    getAll: () => apiRequest<any[]>('/brands'),

    getById: (id: string) => apiRequest<any>(`/brands/${id}`),

    create: (brand: any) =>
        apiRequest<any>('/brands', {
            method: 'POST',
            body: JSON.stringify(brand),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/brands/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/brands/${id}`, {
            method: 'DELETE',
        }),

    uploadLogo: async (id: string, file: File) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_BASE}/brands/${id}/upload/logo`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        return response.json();
    },
};

// ============== CAMPAIGNS API ==============
export const campaignsApi = {
    getAll: () => apiRequest<any[]>('/campaigns'),

    getById: (id: string) => apiRequest<any>(`/campaigns/${id}`),

    create: (data: { campaign: any; linkTalent?: any }) =>
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

// ============== COLLABORATIONS API ==============
export const collaborationsApi = {
    getAll: (filters?: { talentId?: string; campaignId?: string }) => {
        const params = new URLSearchParams();
        if (filters?.talentId) params.set('talentId', filters.talentId);
        if (filters?.campaignId) params.set('campaignId', filters.campaignId);
        const query = params.toString() ? `?${params.toString()}` : '';
        return apiRequest<any[]>(`/collaborations${query}`);
    },

    create: (data: { collaboration: any; appointments?: any[] }) =>
        apiRequest<any>('/collaborations', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    update: (id: string, updates: any) =>
        apiRequest<any>(`/collaborations/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        }),

    delete: (id: string) =>
        apiRequest<{ success: boolean }>(`/collaborations/${id}`, {
            method: 'DELETE',
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
    brands: brandsApi,
    campaigns: campaignsApi,
    collaborations: collaborationsApi,
    appointments: appointmentsApi,
    income: incomeApi,
    costs: costsApi,
    notifications: notificationsApi,
    search: searchApi,
    analytics: analyticsApi,
};

export default api;
