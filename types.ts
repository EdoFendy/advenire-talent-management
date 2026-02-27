
export enum AppointmentType {
  SHOOTING = 'Shooting',
  PUBLICATION = 'Pubblicazione',
  CALL = 'Call/Meeting',
  DELIVERY = 'Consegna Materiale',
  OTHER = 'Altro'
}

export enum CampaignTalentStatus {
  INVITED = 'invitato',
  PENDING = 'in_attesa',
  CONFIRMED = 'confermato',
  DECLINED = 'rifiutato',
  DELIVERED = 'consegnato',
  PAID = 'pagato'
}

export enum CampaignStatus {
  DRAFT = 'Bozza',
  ACTIVE = 'Attiva',
  CLOSED = 'Chiusa'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface Attachment {
  id: string;
  name: string;
  type: 'media_kit' | 'price_list' | 'insight' | 'document';
  url: string;
  size: string;
}

export interface Talent {
  id: string;
  firstName: string;
  lastName: string;
  stageName: string;
  display_name?: string;
  birthDate?: string;
  phone?: string;
  email: string;
  // Social
  instagram?: string;
  instagramFollowers?: number;
  tiktok?: string;
  tiktokFollowers?: number;
  youtube_url?: string;
  twitch_url?: string;
  other_socials?: string;
  // Address (legacy single field)
  address?: string;
  // Address (structured)
  address_street?: string;
  address_city?: string;
  address_zip?: string;
  address_country?: string;
  // Shipping
  shippingNotes?: string;
  // Payment & Billing
  iban?: string;
  vat?: string;
  taxNotes?: string;
  payout_method?: 'IBAN' | 'PayPal' | 'Entrambi';
  paypal_email?: string;
  fiscal_code?: string;
  bank_name?: string;
  billing_name?: string;
  billing_address_street?: string;
  billing_address_city?: string;
  billing_address_zip?: string;
  billing_address_country?: string;
  // Media
  photoUrl?: string;
  gallery: string[];
  attachments: any[];
  // Status & notes
  status: 'active' | 'inactive';
  notes?: string;
}

export interface Client {
  id: string;
  tipo?: string;
  ragione_sociale: string;
  referente?: string;
  email?: string;
  telefono?: string;
  note?: string;
}

export interface Appointment {
  id: string;
  talentId: string;
  talentName: string;
  brand: string;
  type: AppointmentType;
  date: string;
  deadline?: string;
  status: 'planned' | 'completed' | 'cancelled';
  collaborationId: string;
  description?: string;
  location?: string;
}

export interface CampaignTalent {
  id: string;
  campaign_id: string;
  talent_id: string;
  compenso_lordo: number;
  stato: CampaignTalentStatus;
  note?: string;
  deadline?: string;
  responded_at?: string;
  // Joined talent fields (when querying with JOIN)
  firstName?: string;
  lastName?: string;
  stageName?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  // Joined campaign fields (when querying by talent)
  campaign_name?: string;
  campaign_tipo?: string;
  campaign_status?: string;
  totalBudget?: number;
  data_inizio?: string;
  data_fine?: string;
  client_id?: string;
}

export interface ExtraCost {
  id: string;
  campaignId: string;
  category: 'videomaker' | 'luci' | 'van' | 'ads' | 'location' | 'altro';
  amount: number;
  date: string;
  provider?: string;
  status: 'paid' | 'unpaid';
  note?: string;
}

export interface Income {
  id: string;
  campaignId: string;
  amount: number;
  status: 'received' | 'pending';
  date: string;
  expectedDate?: string;
  note?: string;
}

export interface Campaign {
  id: string;
  name: string;
  brand?: string;
  tipo: string;
  client_id?: string;
  totalBudget: number;
  agencyFeePercent: number;
  status: CampaignStatus;
  notes?: string;
  data_inizio?: string;
  data_fine?: string;
  period?: string;
  deadline?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: TaskStatus;
  priority: TaskPriority;
  related_type?: 'campaign' | 'talent' | 'client';
  related_id?: string;
  assigned_talent_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface HomeNote {
  id: string;
  note_text: string;
  updated_at: string;
}

export interface QuoteItem {
  descrizione: string;
  link_social: string;
  quantita: number;
}

export interface Quote {
  id: string;
  titolo: string;
  tipo: 'campagna' | 'shooting' | 'evento' | 'consulenza' | 'custom';
  client_id?: string;
  campaign_id?: string;
  stato: 'bozza' | 'inviato' | 'accettato' | 'rifiutato';
  note?: string;
  subtotale: number;
  iva_percent: number;
  totale: number;
  items: QuoteItem[];
  createdAt?: string;
  updatedAt?: string;
}

export type Role = 'admin' | 'team' | 'finance' | 'talent';

export interface AuthState {
  user: {
    id: string;
    name: string;
    role: Role;
    talentId?: string;
  } | null;
}

export interface Notification {
  id: string;
  userId?: string;
  type: string;
  title: string;
  message?: string;
  read: boolean;
  link?: string;
  createdAt: string;
  action_required?: boolean;
  action_type?: string;
  action_data?: string;
}

// ====== Backward-compatible aliases (used by legacy pages until rewrite) ======

export enum CollaborationStatus {
  CONFIRMED = 'Confermata',
  COMPLETED = 'Completata',
  CANCELLED = 'Cancellata',
  DRAFT = 'Bozza'
}

export enum PaymentStatus {
  PAID = 'Saldato',
  UNPAID = 'Non Saldato',
  PENDING = 'In attesa'
}

export interface Collaboration {
  id: string;
  talentId: string;
  brand: string;
  campaignId: string;
  type: string;
  fee: number;
  status: string;
  paymentStatus: string;
  paidAmount: number;
  notes: string;
  deadline?: string;
}

export interface Brand {
  id: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  notes: string;
  logoUrl?: string;
  website?: string;
  vat?: string;
  address?: string;
}

export interface CompanySettings {
  id: string;
  ragione_sociale: string;
  piva?: string;
  codice_fiscale?: string;
  indirizzo_via?: string;
  indirizzo_citta?: string;
  indirizzo_cap?: string;
  indirizzo_paese?: string;
  email?: string;
  telefono?: string;
  pec?: string;
  sdi?: string;
  website?: string;
  logo_url?: string;
  note?: string;
  updated_at?: string;
}
