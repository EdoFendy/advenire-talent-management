
import React, { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, Briefcase, AlertTriangle, Check, X,
  ChevronLeft, ChevronRight, MapPin, Zap, Settings, Lock,
  DollarSign, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format, addDays, parseISO, isSameDay, startOfMonth, endOfMonth,
  eachDayOfInterval, isBefore, isAfter, subMonths, addMonths,
  startOfWeek, endOfWeek, isSameMonth, isToday as isDateToday
} from 'date-fns';
import { it } from 'date-fns/locale';
import { Talent, Appointment, Collaboration, Campaign, AppointmentType, CampaignTalentStatus } from '../types';
import { useApp } from '../context/AppContext';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { StatCard } from '@/components/ui/stat-card';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { staggerContainer, staggerItem } from '@/lib/animations';

// ─── Helpers ────────────────────────────────────────────────────────────────

const getTypeIcon = (type: AppointmentType) => {
  switch (type) {
    case AppointmentType.SHOOTING: return '📸';
    case AppointmentType.PUBLICATION: return '📱';
    case AppointmentType.CALL: return '📞';
    case AppointmentType.DELIVERY: return '📦';
    default: return '📅';
  }
};

interface CalendarEvent {
  id: string;
  title: string;
  type: 'appointment' | 'campaign';
  date: string;
  color: string;
  label?: string;
  description?: string;
  appointmentType?: AppointmentType;
  status?: string;
  time?: string;
  brand?: string;
}

// ─── Props ──────────────────────────────────────────────────────────────────

interface TalentDashboardProps {
  talentId: string;
  talents: Talent[];
  appointments: Appointment[];
  collaborations: Collaboration[];
  campaigns: Campaign[];
}

// ─── Main Component ─────────────────────────────────────────────────────────

const TalentDashboard: React.FC<TalentDashboardProps> = ({ talentId, talents, appointments, collaborations, campaigns }) => {
  const navigate = useNavigate();
  const {
    notifications, campaignTalents, respondToCampaignAssignment,
    markNotificationAsRead, showToast
  } = useApp();

  const talent = talents.find(t => t.id === talentId);

  // ── State ──────────────────────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCampaignModal, setShowCampaignModal] = useState(true);

  // ── Date strings ───────────────────────────────────────────────────────
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const tomorrow = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), []);
  const dayAfterTomorrow = useMemo(() => format(addDays(new Date(), 2), 'yyyy-MM-dd'), []);

  // ── My campaign talents ────────────────────────────────────────────────
  const myCampaignTalents = useMemo(() => {
    return campaignTalents.filter(ct => ct.talent_id === talentId);
  }, [campaignTalents, talentId]);

  // ── My campaigns (ones this talent is assigned to) ─────────────────────
  const myCampaigns = useMemo(() => {
    const myCampaignIds = new Set(myCampaignTalents.map(ct => ct.campaign_id));
    return campaigns.filter(c => myCampaignIds.has(c.id));
  }, [campaigns, myCampaignTalents]);

  // ── Stats ──────────────────────────────────────────────────────────────
  const activeCampaignsCount = useMemo(() => {
    const myCollabs = collaborations.filter(c => c.talentId === talentId);
    const activeCampaignIds = new Set(myCollabs.map(c => c.campaignId));
    return campaigns.filter(c => activeCampaignIds.has(c.id) && c.status === 'Attiva').length;
  }, [collaborations, campaigns, talentId]);

  const pendingEarnings = useMemo(() => {
    const myCollabs = collaborations.filter(c => c.talentId === talentId);
    const totalEarnings = myCollabs.reduce((acc, c) => acc + c.fee, 0);
    const paid = myCollabs.filter(c => c.paymentStatus === 'Saldato').reduce((acc, c) => acc + c.fee, 0);
    return totalEarnings - paid;
  }, [collaborations, talentId]);

  const nextEvent = useMemo(() => {
    return appointments
      .filter(a => a.talentId === talentId && new Date(a.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;
  }, [appointments, talentId]);

  // ── Day column data ────────────────────────────────────────────────────
  const getDayData = useCallback((dayStr: string) => {
    const dayAppointments = appointments.filter(
      a => a.talentId === talentId && a.date === dayStr
    );

    const dayCampaignEvents: { campaign: Campaign; label: string }[] = [];
    myCampaigns.forEach(c => {
      if (c.deadline === dayStr) dayCampaignEvents.push({ campaign: c, label: 'Deadline' });
      if (c.data_inizio === dayStr) dayCampaignEvents.push({ campaign: c, label: 'Inizio' });
      if (c.data_fine === dayStr) dayCampaignEvents.push({ campaign: c, label: 'Fine' });
    });

    return { dayAppointments, dayCampaignEvents };
  }, [appointments, myCampaigns, talentId]);

  const todayData = useMemo(() => getDayData(today), [getDayData, today]);
  const tomorrowData = useMemo(() => getDayData(tomorrow), [getDayData, tomorrow]);
  const dayAfterData = useMemo(() => getDayData(dayAfterTomorrow), [getDayData, dayAfterTomorrow]);

  // ── Urgenze ────────────────────────────────────────────────────────────
  const urgentItems = useMemo(() => {
    const items: { id: string; type: 'deadline' | 'pending'; label: string; sublabel: string; severity: 'red' | 'amber' }[] = [];
    const twoDaysFromNow = format(addDays(new Date(), 2), 'yyyy-MM-dd');

    // Campaigns with deadline within 2 days
    myCampaigns.forEach(c => {
      if (c.deadline && c.deadline <= twoDaysFromNow && c.deadline >= today) {
        items.push({
          id: `deadline-${c.id}`,
          type: 'deadline',
          label: c.name,
          sublabel: `Deadline: ${format(parseISO(c.deadline), 'dd MMM', { locale: it })}`,
          severity: c.deadline === today ? 'red' : 'amber'
        });
      }
    });

    // Campaign assignments with stato === 'in_attesa'
    myCampaignTalents.forEach(ct => {
      if (ct.stato === CampaignTalentStatus.PENDING) {
        const camp = campaigns.find(c => c.id === ct.campaign_id);
        items.push({
          id: `pending-${ct.id}`,
          type: 'pending',
          label: camp?.name || ct.campaign_name || 'Campagna',
          sublabel: 'In attesa di conferma',
          severity: 'amber'
        });
      }
    });

    return items;
  }, [myCampaigns, myCampaignTalents, campaigns, today]);

  // ── Calendar events ────────────────────────────────────────────────────
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Appointments for this talent
    appointments.forEach(a => {
      if (a.talentId !== talentId || !a.date) return;
      events.push({
        id: `app-${a.id}`,
        title: `${a.type}: ${a.brand}`,
        type: 'appointment',
        date: a.date,
        color: 'bg-amber-400',
        appointmentType: a.type,
        status: a.status,
        brand: a.brand,
        description: a.description || `${a.type}${a.location ? ` @ ${a.location}` : ''}`,
      });
      if (a.deadline) {
        events.push({
          id: `app-deadline-${a.id}`,
          title: `Deadline: ${a.brand}`,
          type: 'appointment',
          date: a.deadline,
          color: 'bg-red-500',
          brand: a.brand,
          label: 'Deadline',
        });
      }
    });

    // Campaign events
    myCampaigns.forEach(c => {
      if (c.data_inizio) {
        events.push({
          id: `camp-start-${c.id}`,
          title: c.name,
          type: 'campaign',
          date: c.data_inizio,
          color: 'bg-purple-500',
          label: 'Inizio',
          description: `Inizio campagna${c.brand ? ` - ${c.brand}` : ''}`,
        });
      }
      if (c.data_fine) {
        events.push({
          id: `camp-end-${c.id}`,
          title: c.name,
          type: 'campaign',
          date: c.data_fine,
          color: 'bg-purple-500',
          label: 'Fine',
          description: `Fine campagna${c.brand ? ` - ${c.brand}` : ''}`,
        });
      }
      if (c.deadline) {
        events.push({
          id: `camp-deadline-${c.id}`,
          title: `Deadline: ${c.name}`,
          type: 'campaign',
          date: c.deadline,
          color: 'bg-red-500',
          label: 'Deadline',
          description: `Deadline${c.brand ? ` - ${c.brand}` : ''}`,
        });
      }
    });

    return events;
  }, [appointments, myCampaigns, talentId]);

  const getEventsForDay = useCallback((dateStr: string) => {
    return calendarEvents.filter(e => e.date === dateStr);
  }, [calendarEvents]);

  // ── Calendar grid ──────────────────────────────────────────────────────
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  // ── Campaign accept/decline notifications ──────────────────────────────
  const campaignActionNotifications = useMemo(() => {
    return notifications.filter(
      n => n.action_required && n.action_type === 'campaign_accept_decline' && !n.read
        && (!n.userId || n.userId === talentId)
    );
  }, [notifications, talentId]);

  const currentActionNotif = campaignActionNotifications[0] || null;

  const actionNotifData = useMemo(() => {
    if (!currentActionNotif?.action_data) return null;
    try {
      return JSON.parse(currentActionNotif.action_data);
    } catch {
      return null;
    }
  }, [currentActionNotif]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) {
      showToast('Le password non corrispondono', 'error');
      return;
    }
    if (passwordForm.new.length < 6) {
      showToast('La password deve essere di almeno 6 caratteri', 'error');
      return;
    }
    setIsChangingPassword(true);
    try {
      const response = await fetch('http://localhost:3001/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: talentId, newPassword: passwordForm.new })
      });
      if (response.ok) {
        showToast('Password aggiornata con successo', 'success');
        setShowSettings(false);
        setPasswordForm({ new: '', confirm: '' });
      } else {
        showToast('Errore durante l\'aggiornamento', 'error');
      }
    } catch {
      showToast('Errore di connessione', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleAcceptCampaign = async () => {
    if (!actionNotifData?.campaignTalentId) return;
    try {
      await respondToCampaignAssignment(actionNotifData.campaignTalentId, 'accept');
      if (currentActionNotif) await markNotificationAsRead(currentActionNotif.id);
      setShowCampaignModal(true);
    } catch {
      showToast('Errore nell\'accettazione', 'error');
    }
  };

  const handleDeclineCampaign = async () => {
    if (!actionNotifData?.campaignTalentId) return;
    try {
      await respondToCampaignAssignment(actionNotifData.campaignTalentId, 'decline');
      if (currentActionNotif) await markNotificationAsRead(currentActionNotif.id);
      setShowCampaignModal(true);
    } catch {
      showToast('Errore nel rifiuto', 'error');
    }
  };

  const handleCalendarDayClick = useCallback((day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEvents = getEventsForDay(dateStr);
    if (dayEvents.length > 0) {
      setSelectedCalendarDay(day);
    }
  }, [getEventsForDay]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (!talent) return <div className="p-20 text-center text-white font-bold">Caricamento profilo...</div>;

  // ── Day Column Component ───────────────────────────────────────────────
  const DayColumn: React.FC<{
    title: string;
    dateStr: string;
    data: { dayAppointments: Appointment[]; dayCampaignEvents: { campaign: Campaign; label: string }[] };
    accentColor: string;
  }> = ({ title, dateStr, data, accentColor }) => (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar size={14} className={accentColor} />
          <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{title}</h3>
        </div>
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
          {format(parseISO(dateStr), 'EEE dd MMM', { locale: it })}
        </span>
      </div>

      <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
        {data.dayAppointments.length === 0 && data.dayCampaignEvents.length === 0 ? (
          <p className="text-[10px] text-muted-foreground py-6 text-center italic">Nessun impegno</p>
        ) : (
          <>
            {data.dayAppointments.map(app => (
              <div
                key={app.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-amber-500/20 hover:bg-white/[0.04] transition-all"
              >
                <div className="w-9 h-9 bg-white/[0.06] rounded-lg flex items-center justify-center text-base flex-shrink-0">
                  {getTypeIcon(app.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{app.brand}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{app.type}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {app.location && (
                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <MapPin size={9} />
                      <span className="truncate max-w-[60px]">{app.location}</span>
                    </span>
                  )}
                  <Badge
                    variant={
                      app.status === 'completed' ? 'success' :
                      app.status === 'cancelled' ? 'destructive' :
                      'warning'
                    }
                    className="text-[8px]"
                  >
                    {app.status === 'completed' ? 'Fatto' : app.status === 'cancelled' ? 'Annullato' : 'Pianificato'}
                  </Badge>
                </div>
              </div>
            ))}

            {data.dayCampaignEvents.map((evt, idx) => (
              <div
                key={`camp-${evt.campaign.id}-${idx}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-purple-500/10 bg-purple-500/[0.03] hover:border-purple-500/20 transition-all"
              >
                <div className="w-9 h-9 bg-purple-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Briefcase size={14} className="text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-white truncate">{evt.campaign.name}</p>
                  {evt.campaign.brand && (
                    <p className="text-[10px] text-muted-foreground font-bold truncate">{evt.campaign.brand}</p>
                  )}
                </div>
                <Badge
                  variant={evt.label === 'Deadline' ? 'destructive' : 'default'}
                  className="text-[8px]"
                >
                  {evt.label}
                </Badge>
              </div>
            ))}
          </>
        )}
      </div>
    </GlassCard>
  );

  // ─── RENDER ────────────────────────────────────────────────────────────

  return (
    <AnimatedContainer className="space-y-6 pb-20">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <GlassCard variant="prominent" className="p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-5">
            <Avatar className="w-14 h-14 rounded-2xl border-2 border-white/[0.1] shadow-2xl">
              {talent.photoUrl ? (
                <AvatarImage src={talent.photoUrl} alt={talent.stageName} className="rounded-2xl" />
              ) : null}
              <AvatarFallback className="rounded-2xl text-lg font-black">
                {talent.firstName?.[0]}{talent.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">
                Ciao, {talent.firstName}
              </h1>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest mt-1">
                {format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="glass"
              size="icon"
              onClick={() => setShowSettings(true)}
            >
              <Settings size={18} />
            </Button>
            <Button
              variant="glass"
              onClick={() => navigate('/my-calendar')}
              className="font-black uppercase text-xs tracking-widest"
            >
              <Calendar size={15} />
              <span>Calendario</span>
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* ── Main Grid: Left Content + Right Calendar ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6">

        {/* ═══════ LEFT PANEL ═══════ */}
        <motion.div
          className="space-y-4"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >

          {/* ── Stats Row ──────────────────────────────────────────── */}
          <motion.div variants={staggerItem} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatCard
              label="Campagne Attive"
              value={activeCampaignsCount}
              icon={Briefcase}
              color="blue"
            />

            <StatCard
              label="Da Incassare"
              value={`\u20AC${pendingEarnings.toLocaleString()}`}
              icon={DollarSign}
              color="emerald"
            />

            <StatCard
              label="Prossimo Evento"
              value={nextEvent ? nextEvent.brand : 'Nessun evento'}
              icon={Zap}
              color="amber"
            />
          </motion.div>

          {/* ── Day Columns: Oggi / Domani / Dopodomani ───────────── */}
          <motion.div variants={staggerItem}>
            <DayColumn
              title="Oggi"
              dateStr={today}
              data={todayData}
              accentColor="text-blue-500"
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <DayColumn
              title="Domani"
              dateStr={tomorrow}
              data={tomorrowData}
              accentColor="text-emerald-500"
            />
          </motion.div>

          <motion.div variants={staggerItem}>
            <DayColumn
              title="Dopodomani"
              dateStr={dayAfterTomorrow}
              data={dayAfterData}
              accentColor="text-purple-500"
            />
          </motion.div>

          {/* ── Urgenze Section ────────────────────────────────────── */}
          <motion.div variants={staggerItem}>
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-400" />
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Urgenze</h3>
                {urgentItems.length > 0 && (
                  <Badge variant="destructive" className="ml-auto text-[10px]">
                    {urgentItems.length}
                  </Badge>
                )}
              </div>

              <div className="space-y-2 max-h-[260px] overflow-y-auto custom-scrollbar">
                {urgentItems.length === 0 ? (
                  <div className="py-6 text-center">
                    <Check size={24} className="text-emerald-500/30 mx-auto mb-2" />
                    <p className="text-[10px] text-muted-foreground italic">Nessuna urgenza al momento</p>
                  </div>
                ) : (
                  urgentItems.map(item => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        item.severity === 'red'
                          ? 'border-red-500/20 bg-red-500/[0.04]'
                          : 'border-amber-500/20 bg-amber-500/[0.04]'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        item.severity === 'red' ? 'bg-red-500 animate-pulse' : 'bg-amber-400'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-black text-white truncate">{item.label}</p>
                        <p className="text-[10px] text-muted-foreground font-bold">{item.sublabel}</p>
                      </div>
                      <Badge
                        variant={item.type === 'deadline' ? 'destructive' : 'warning'}
                        className="text-[8px]"
                      >
                        {item.type === 'deadline' ? 'Deadline' : 'Da Confermare'}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>

        {/* ═══════ RIGHT PANEL ─ Calendar ═══════ */}
        <div className="space-y-4">
          <GlassCard variant="prominent" className="p-4 md:sticky md:top-28">

            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                >
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-xs font-black text-white uppercase tracking-widest min-w-[130px] text-center">
                  {format(currentMonth, 'MMMM yyyy', { locale: it })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
              <Button
                variant="glass"
                size="sm"
                onClick={() => setCurrentMonth(new Date())}
                className="text-[9px] font-black text-blue-400 uppercase tracking-widest"
              >
                Oggi
              </Button>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'].map(d => (
                <div key={d} className="text-center text-[9px] font-black text-muted-foreground uppercase tracking-widest py-2">
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = getEventsForDay(dateStr);
                const isToday = isDateToday(day);
                const inMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedCalendarDay ? isSameDay(day, selectedCalendarDay) : false;

                // Separate event types for colored dots
                const hasAppointments = dayEvents.some(e => e.type === 'appointment' && !e.label?.includes('Deadline'));
                const hasCampaignEvents = dayEvents.some(e => e.type === 'campaign' && e.label !== 'Deadline');
                const hasDeadlines = dayEvents.some(e => e.color === 'bg-red-500');

                return (
                  <div
                    key={idx}
                    onClick={() => inMonth && handleCalendarDayClick(day)}
                    className={`relative cursor-pointer rounded-lg p-1.5 text-center transition-all hover:bg-white/[0.06] ${
                      !inMonth ? 'opacity-20' : ''
                    } ${isSelected ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
                  >
                    <span className={`text-[11px] font-black flex items-center justify-center rounded-lg w-7 h-7 mx-auto ${
                      isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                      {format(day, 'd')}
                    </span>

                    {/* Colored dots */}
                    {dayEvents.length > 0 && inMonth && (
                      <div className="flex items-center justify-center gap-0.5 mt-1 min-h-[6px]">
                        {hasAppointments && <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        {hasCampaignEvents && <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />}
                        {hasDeadlines && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <Separator className="mt-4 mb-4" />
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Appuntamenti</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Campagne</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Deadline</span>
              </div>
            </div>

            {/* Selected Day Events */}
            <AnimatePresence>
              {selectedCalendarDay && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Separator className="mt-4 mb-4" />
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">
                        {format(selectedCalendarDay, 'd MMMM', { locale: it })}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">
                        {format(selectedCalendarDay, 'EEEE', { locale: it })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setSelectedCalendarDay(null)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-[240px] overflow-y-auto custom-scrollbar">
                    {getEventsForDay(format(selectedCalendarDay, 'yyyy-MM-dd')).map(evt => (
                      <div
                        key={evt.id}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all ${
                          evt.type === 'campaign'
                            ? 'border-purple-500/20 bg-purple-500/[0.03]'
                            : 'border-amber-500/20 bg-amber-500/[0.03]'
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${evt.color}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{evt.title}</p>
                          {evt.description && (
                            <p className="text-[10px] text-muted-foreground truncate">{evt.description}</p>
                          )}
                        </div>
                        <Badge
                          variant={evt.type === 'campaign' ? 'default' : 'warning'}
                          className="text-[8px]"
                        >
                          {evt.type === 'campaign' ? (evt.label || 'Campagna') : 'Appunt.'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* ── Campaign Accept/Decline Modal ──────────────────────────── */}
      <Dialog
        open={!!(currentActionNotif && showCampaignModal && actionNotifData)}
        onOpenChange={(open) => { if (!open) setShowCampaignModal(false); }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500/10 rounded-xl">
                <Briefcase size={20} className="text-purple-400" />
              </div>
              <DialogTitle className="text-lg font-black uppercase tracking-tight">
                Nuova Campagna
              </DialogTitle>
            </div>
          </DialogHeader>

          {actionNotifData && (
            <div className="space-y-5">
              {/* Campaign details */}
              <GlassCard className="p-4 space-y-3">
                <div>
                  <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Campagna</p>
                  <p className="text-sm font-black text-white">{actionNotifData.campaignName || currentActionNotif?.title}</p>
                </div>
                {actionNotifData.brand && (
                  <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Brand</p>
                    <p className="text-sm font-bold text-white">{actionNotifData.brand}</p>
                  </div>
                )}
                {(actionNotifData.dataInizio || actionNotifData.dataFine) && (
                  <div className="flex gap-4">
                    {actionNotifData.dataInizio && (
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Inizio</p>
                        <p className="text-xs font-bold text-white">
                          {format(parseISO(actionNotifData.dataInizio), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                    )}
                    {actionNotifData.dataFine && (
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Fine</p>
                        <p className="text-xs font-bold text-white">
                          {format(parseISO(actionNotifData.dataFine), 'dd MMM yyyy', { locale: it })}
                        </p>
                      </div>
                    )}
                  </div>
                )}
                {actionNotifData.compenso != null && (
                  <div>
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">Compenso</p>
                    <p className="text-xl font-black text-emerald-400">{'\u20AC'}{Number(actionNotifData.compenso).toLocaleString()}</p>
                  </div>
                )}
              </GlassCard>

              {currentActionNotif?.message && (
                <p className="text-xs text-muted-foreground">{currentActionNotif.message}</p>
              )}

              {/* Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="destructive"
                  className="flex-1 font-black uppercase text-[10px] tracking-widest py-6"
                  onClick={handleDeclineCampaign}
                >
                  <X size={14} />
                  Rifiuta
                </Button>
                <Button
                  className="flex-1 font-black uppercase text-[10px] tracking-widest py-6 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20"
                  onClick={handleAcceptCampaign}
                >
                  <Check size={14} />
                  Accetta
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Settings Modal ─────────────────────────────────────────── */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tighter">
              Impostazioni
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-4">
              <Separator />
              <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Sicurezza</h4>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nuova Password</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type="password"
                    required
                    className="pl-12 h-12"
                    placeholder="--------"
                    value={passwordForm.new}
                    onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Conferma Password</Label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type="password"
                    required
                    className="pl-12 h-12"
                    placeholder="--------"
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isChangingPassword}
              className="w-full font-black uppercase text-xs tracking-[0.2em] py-6"
              size="lg"
            >
              {isChangingPassword ? 'Aggiornamento in corso...' : 'Aggiorna Password'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </AnimatedContainer>
  );
};

export default TalentDashboard;
