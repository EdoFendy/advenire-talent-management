
export enum AppointmentType {
  SHOOTING = 'Shooting',
  PUBLICATION = 'Pubblicazione',
  CALL = 'Call/Meeting',
  DELIVERY = 'Consegna Materiale',
  OTHER = 'Altro'
}

export enum CollaborationStatus {
  DRAFT = 'Bozza',
  CONFIRMED = 'Confermata',
  COMPLETED = 'Completata',
  CANCELLED = 'Annullata'
}

export enum PaymentStatus {
  UNPAID = 'Non Saldato',
  PAID = 'Saldato',
  PENDING = 'In Attesa'
}

export enum CampaignStatus {
  DRAFT = 'Bozza',
  ACTIVE = 'Attiva',
  CLOSED = 'Chiusa'
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
  birthDate?: string;
  phone?: string;
  email: string;
  instagram?: string;
  instagramFollowers?: number;
  tiktok?: string;
  tiktokFollowers?: number;
  address?: string;
  shippingNotes?: string;
  iban?: string;
  vat?: string;
  taxNotes?: string;
  photoUrl?: string;
  status: 'active' | 'inactive';
  gallery: string[];
  attachments: any[];
}

export interface Brand {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;
  vat?: string;
  address?: string;
  notes?: string;
  logoUrl?: string;
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

export interface Collaboration {
  id: string;
  talentId: string;
  brand: string;
  campaignId: string;
  type: string;
  fee: number;
  status: CollaborationStatus;
  paymentStatus: PaymentStatus;
  paidAmount?: number;
  deadline?: string;
  notes?: string;
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
  brand: string;
  period: string;
  deadline?: string;
  totalBudget: number;
  agencyFeePercent: number;
  status: CampaignStatus;
  notes?: string;
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
}
