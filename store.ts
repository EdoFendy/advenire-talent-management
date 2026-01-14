
import { Talent, Campaign, Collaboration, Appointment, AppointmentType, CollaborationStatus, CampaignStatus, ExtraCost, Income, PaymentStatus } from './types';

export const INITIAL_TALENTS: Talent[] = [
  {
    id: 't-1',
    firstName: 'Marco',
    lastName: 'Rossi',
    stageName: 'MarkRed',
    birthDate: '1995-05-12',
    phone: '+39 333 1234567',
    email: 'marco.rossi@advenire.it',
    instagram: 'https://instagram.com/markred',
    tiktok: 'https://tiktok.com/@markred',
    address: 'Via Roma 12, 20121 Milano (MI)',
    shippingNotes: 'Citofono Rossi - Piano 4. Lasciare in portineria se assente.',
    iban: 'IT60X0542811101000000123456',
    vat: 'IT12345678901',
    photoUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=400',
    status: 'active',
    gallery: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400'
    ],
    // Added missing attachments property
    attachments: []
  },
  {
    id: 't-2',
    firstName: 'Giulia',
    lastName: 'Bianchi',
    stageName: 'JuliaB',
    birthDate: '1998-09-20',
    phone: '+39 347 7654321',
    email: 'giulia.b@advenire.it',
    instagram: 'https://instagram.com/juliab',
    tiktok: 'https://tiktok.com/@juliab',
    address: 'Corso Vittorio Emanuele 45, 00186 Roma (RM)',
    shippingNotes: 'Portone B, citofono 12. Orario preferito: mattina.',
    iban: 'IT99Z0542811101000000987654',
    vat: 'IT98765432109',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=400',
    status: 'active',
    gallery: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400'
    ],
    // Added missing attachments property
    attachments: []
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'c-1',
    name: 'Winter Collection 2024',
    brand: 'Amazon Fashion',
    period: 'Nov 2024 - Gen 2025',
    deadline: '2025-01-31',
    totalBudget: 45000,
    agencyFeePercent: 20,
    status: CampaignStatus.ACTIVE
  },
  {
    id: 'c-2',
    name: 'Gaming Nights 25',
    brand: 'Sony PlayStation',
    period: 'Dic 2024 - Feb 2025',
    deadline: '2025-02-28',
    totalBudget: 60000,
    agencyFeePercent: 15,
    status: CampaignStatus.ACTIVE
  }
];

export const INITIAL_COLLABORATIONS: Collaboration[] = [
  {
    id: 'col-1',
    talentId: 't-1',
    brand: 'Amazon Fashion',
    campaignId: 'c-1',
    type: '1 Reels + 3 Stories',
    deadline: '2024-12-24',
    fee: 3500,
    status: CollaborationStatus.CONFIRMED,
    paymentStatus: PaymentStatus.UNPAID
  },
  {
    id: 'col-2',
    talentId: 't-1',
    brand: 'Sony PlayStation',
    campaignId: 'c-2',
    type: 'Twitch Stream Integration',
    deadline: '2025-01-15',
    fee: 4200,
    status: CollaborationStatus.COMPLETED,
    paymentStatus: PaymentStatus.PAID
  },
  {
    id: 'col-3',
    talentId: 't-2',
    brand: 'Amazon Fashion',
    campaignId: 'c-1',
    type: 'Content Creation (Photos)',
    deadline: '2024-12-20',
    fee: 2800,
    status: CollaborationStatus.CONFIRMED,
    paymentStatus: PaymentStatus.UNPAID
  }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'app-1',
    talentId: 't-1',
    talentName: 'MarkRed',
    brand: 'Amazon Fashion',
    type: AppointmentType.SHOOTING,
    date: new Date().toISOString(),
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'planned',
    collaborationId: 'col-1',
    description: 'Shooting presso Studio 4 Milano.'
  },
  {
    id: 'app-2',
    talentId: 't-1',
    talentName: 'MarkRed',
    brand: 'Amazon Fashion',
    type: AppointmentType.PUBLICATION,
    date: new Date(Date.now() + 86400000 * 5).toISOString(),
    deadline: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'planned',
    collaborationId: 'col-1',
    description: 'Pubblicazione Reel su Instagram.'
  }
];

export const INITIAL_INCOME: Income[] = [
  { id: 'inc-1', campaignId: 'c-1', amount: 45000, status: 'received', date: '2024-11-20' },
  { id: 'inc-2', campaignId: 'c-2', amount: 60000, status: 'pending', date: '2025-01-15' }
];

export const INITIAL_EXTRA_COSTS: ExtraCost[] = [
  // Corrected category to lowercase 'videomaker'
  { id: 'ex-1', campaignId: 'c-1', category: 'videomaker', amount: 1500, date: '2024-11-15', status: 'paid' },
  // Corrected 'Noleggio Luci' to 'luci'
  { id: 'ex-2', campaignId: 'c-1', category: 'luci', amount: 500, date: '2024-11-15', status: 'paid' }
];
