
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock, MapPin, DollarSign, ArrowUpRight, CheckCircle2,
  Settings, Lock, X, Bell, Calendar, TrendingUp, Briefcase, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isSameDay } from 'date-fns';
import { it } from 'date-fns/locale';
import { Talent, Appointment, Collaboration, Campaign, AppointmentType } from '../types';
import { useApp } from '../context/AppContext';

interface TalentDashboardProps {
  talentId: string;
  talents: Talent[];
  appointments: Appointment[];
  collaborations: Collaboration[];
  campaigns: Campaign[];
}

const TalentDashboard: React.FC<TalentDashboardProps> = ({ talentId, talents, appointments, collaborations, campaigns }) => {
  const navigate = useNavigate();
  const { notifications, markNotificationAsRead, showToast } = useApp();
  const talent = talents.find(t => t.id === talentId);

  const [showSettings, setShowSettings] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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
    } catch (error) {
      showToast('Errore di connessione', 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Appointments
  const upcomingAppointments = useMemo(() => {
    return appointments
      .filter(a => a.talentId === talentId && new Date(a.date) >= new Date())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);
  }, [appointments, talentId]);

  const todayAppointments = useMemo(() => {
    return appointments.filter(a => a.talentId === talentId && isSameDay(new Date(a.date), new Date()));
  }, [appointments, talentId]);

  // Finance
  const financeStats = useMemo(() => {
    const myCollabs = collaborations.filter(c => c.talentId === talentId);
    const totalEarnings = myCollabs.reduce((acc, c) => acc + c.fee, 0);
    const paid = myCollabs.filter(c => c.paymentStatus === 'Saldato').reduce((acc, c) => acc + c.fee, 0);
    const pending = totalEarnings - paid;
    return { totalEarnings, paid, pending };
  }, [collaborations, talentId]);

  // Campaigns
  const activeCampaignsCount = useMemo(() => {
    const myCollabs = collaborations.filter(c => c.talentId === talentId);
    const activeCampaignIds = new Set(myCollabs.map(c => c.campaignId));
    return campaigns.filter(c => activeCampaignIds.has(c.id) && c.status === 'Attiva').length;
  }, [collaborations, campaigns, talentId]);

  // Notifications
  const myNotifications = useMemo(() => {
    return notifications
      .filter(n => (!n.userId || n.userId === talentId) && !n.read)
      .slice(0, 3);
  }, [notifications, talentId]);

  if (!talent) return <div className="p-20 text-center text-white font-bold">Caricamento profilo...</div>;

  const getTypeIcon = (type: AppointmentType) => {
    switch (type) {
      case AppointmentType.SHOOTING: return '📸';
      case AppointmentType.PUBLICATION: return '📱';
      case AppointmentType.CALL: return '📞';
      default: return '📅';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/5">
        <div className="flex items-center space-x-6">
          {talent.photoUrl && (
            <img
              src={talent.photoUrl}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 shadow-2xl"
              alt={talent.stageName}
            />
          )}
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Ciao, {talent.firstName}</h1>
            <p className="text-zinc-500 font-medium text-lg mt-1">Ecco il tuo hub operativo per oggi.</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowSettings(true)}
            className="p-4 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl transition-all"
          >
            <Settings size={20} />
          </button>
          <button
            onClick={() => navigate('/my-calendar')}
            className="flex items-center space-x-2 bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
          >
            <Calendar size={16} />
            <span>Calendario</span>
          </button>
        </div>
      </header>

      {/* Notifications Banner */}
      {myNotifications.length > 0 && (
        <div className="bg-blue-600/10 border border-blue-500/20 rounded-[2rem] p-6 space-y-4">
          <div className="flex items-center space-x-3">
            <Bell className="text-blue-500 animate-pulse" size={20} />
            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Aggiornamenti Recenti</h3>
          </div>
          <div className="space-y-3">
            {myNotifications.map(notif => (
              <div key={notif.id} className="flex items-center justify-between bg-zinc-900/50 p-4 rounded-2xl border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white mb-1">{notif.title}</p>
                  <p className="text-[10px] text-zinc-400">{notif.message}</p>
                </div>
                <button
                  onClick={() => markNotificationAsRead(notif.id)}
                  className="px-4 py-2 bg-blue-500/10 text-blue-500 rounded-xl text-[9px] font-black uppercase hover:bg-blue-500 hover:text-white transition-all"
                >
                  Segna Letto
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Briefcase size={20} /></span>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Campagne Attive</span>
          </div>
          <p className="text-4xl font-black text-white">{activeCampaignsCount}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><DollarSign size={20} /></span>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Da Incassare</span>
          </div>
          <p className="text-4xl font-black text-white">€{financeStats.pending.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><TrendingUp size={20} /></span>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Prossimo Evento</span>
          </div>
          {upcomingAppointments.length > 0 ? (
            <div>
              <p className="text-lg font-black text-white truncate">{upcomingAppointments[0].brand}</p>
              <p className="text-xs font-bold text-zinc-500 mt-1">
                {format(new Date(upcomingAppointments[0].date), 'dd MMM', { locale: it })}
              </p>
            </div>
          ) : (
            <p className="text-sm font-bold text-zinc-600">Nessun evento futuro</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Today's Schedule */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Programma di Oggi</h3>
            <span className="text-xs font-bold text-zinc-500 uppercase">{format(new Date(), 'EEEE d MMMM', { locale: it })}</span>
          </div>
          <div className="flex-1 p-6 space-y-4">
            {todayAppointments.length > 0 ? todayAppointments.map(app => (
              <div key={app.id} className="flex items-center space-x-4 p-5 bg-zinc-900/50 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-all">
                <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-xl">
                  {getTypeIcon(app.type)}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">{app.type}</p>
                  <h4 className="text-lg font-black text-white uppercase">{app.brand}</h4>
                </div>
                <div className="text-right text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-zinc-800/50 px-3 py-2 rounded-lg">
                  Oggi
                </div>
              </div>
            )) : (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-600">
                <CheckCircle2 size={32} className="mb-3 opacity-50" />
                <p className="text-sm font-bold uppercase tracking-widest">Nessun impegno oggi</p>
                <p className="text-[10px] mt-1">Goditi il tuo tempo libero!</p>
              </div>
            )}
          </div>
        </div>

        {/* Coming Up */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-xl font-black text-white uppercase tracking-tighter">Prossimi Eventi</h3>
            <button onClick={() => navigate('/my-calendar')} className="text-[10px] font-black text-zinc-500 uppercase hover:text-white flex items-center">
              Vedi Tutti <ChevronRight size={12} className="ml-1" />
            </button>
          </div>
          <div className="flex-1 p-6 space-y-4">
            {upcomingAppointments.length > 0 ? upcomingAppointments.map(app => (
              <div key={app.id} className="flex items-center justify-between p-5 hover:bg-zinc-900/30 rounded-2xl transition-all cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col items-center justify-center w-12 h-12 bg-zinc-900 rounded-xl border border-white/5 group-hover:border-blue-500/30 transition-all">
                    <span className="text-[9px] font-black text-zinc-500 uppercase">{format(new Date(app.date), 'MMM', { locale: it })}</span>
                    <span className="text-lg font-black text-white">{format(new Date(app.date), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white uppercase group-hover:text-blue-500 transition-colors">{app.brand}</h4>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase mt-0.5">{app.type}</p>
                  </div>
                </div>
                {app.deadline && (
                  <div className="flex items-center text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded-lg">
                    <Clock size={10} className="mr-1" />
                    <span>Consegna</span>
                  </div>
                )}
              </div>
            )) : (
              <div className="h-40 flex flex-col items-center justify-center text-zinc-600">
                <Calendar size={32} className="mb-3 opacity-50" />
                <p className="text-sm font-bold uppercase tracking-widest">Agenda libera</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-lg"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-3xl overflow-hidden p-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Impostazioni</h3>
                <button onClick={() => setShowSettings(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handlePasswordChange} className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Sicurezza</h4>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nuova Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        required
                        className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        placeholder="••••••••"
                        value={passwordForm.new}
                        onChange={e => setPasswordForm({ ...passwordForm, new: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Conferma Password</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input
                        type="password"
                        required
                        className="w-full bg-black border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        placeholder="••••••••"
                        value={passwordForm.confirm}
                        onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                  {isChangingPassword ? 'Aggiornamento in corso...' : 'Aggiorna Password'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div >
  );
};

export default TalentDashboard;
