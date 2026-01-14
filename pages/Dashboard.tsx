
import React, { useState, useMemo } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, addDays, isSameMonth,
  addWeeks, subWeeks, startOfDay, endOfDay, eachHourOfInterval
} from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter,
  Search, Video, Camera, Bell, MessageSquare, Truck, ArrowUpRight,
  X, Clock, MapPin, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Appointment, Talent, Collaboration, AppointmentType } from '../types';

interface DashboardProps {
  appointments: Appointment[];
  talents: Talent[];
  collaborations: Collaboration[];
}

type ViewType = 'month' | 'week' | 'day';

const Dashboard: React.FC<DashboardProps> = ({ appointments, talents, collaborations }) => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewType>('month');
  const [filters, setFilters] = useState({
    talentId: 'ALL',
    type: 'ALL',
    brand: ''
  });
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const filteredAppointments = useMemo(() => {
    return appointments.filter(app => {
      const matchTalent = filters.talentId === 'ALL' || app.talentId === filters.talentId;
      const matchType = filters.type === 'ALL' || app.type === filters.type;
      const matchBrand = filters.brand === '' || app.brand.toLowerCase().includes(filters.brand.toLowerCase());
      return matchTalent && matchType && matchBrand;
    });
  }, [appointments, filters]);

  // Month calendar days
  const monthCalendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [currentDate]);

  // Week calendar days
  const weekCalendarDays = useMemo(() => {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [currentDate]);

  // Day hours
  const dayHours = useMemo(() => {
    const start = startOfDay(currentDate);
    const hours = [];
    for (let i = 8; i <= 20; i++) {
      hours.push(addDays(start, 0));
      hours[hours.length - 1] = new Date(start.getFullYear(), start.getMonth(), start.getDate(), i, 0, 0);
    }
    return hours;
  }, [currentDate]);

  const getTypeIcon = (type: AppointmentType) => {
    switch (type) {
      case AppointmentType.SHOOTING: return <Camera size={12} />;
      case AppointmentType.PUBLICATION: return <Video size={12} />;
      case AppointmentType.CALL: return <MessageSquare size={12} />;
      case AppointmentType.DELIVERY: return <Truck size={12} />;
      default: return <CalendarIcon size={12} />;
    }
  };

  const getTypeColor = (type: AppointmentType) => {
    switch (type) {
      case AppointmentType.SHOOTING: return 'bg-purple-500/10 border-purple-500 text-purple-400';
      case AppointmentType.PUBLICATION: return 'bg-emerald-500/10 border-emerald-500 text-emerald-400';
      case AppointmentType.CALL: return 'bg-amber-500/10 border-amber-500 text-amber-400';
      case AppointmentType.DELIVERY: return 'bg-blue-500/10 border-blue-500 text-blue-400';
      default: return 'bg-zinc-800 border-zinc-600 text-zinc-400';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    } else if (view === 'week') {
      setCurrentDate(direction === 'prev' ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === 'prev' ? addDays(currentDate, -1) : addDays(currentDate, 1));
    }
  };

  const getDateLabel = () => {
    if (view === 'month') {
      return format(currentDate, 'MMMM yyyy', { locale: it });
    } else if (view === 'week') {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMMM yyyy', { locale: it })}`;
    } else {
      return format(currentDate, 'EEEE d MMMM yyyy', { locale: it });
    }
  };

  // Stats
  const todayApps = appointments.filter(a => isSameDay(new Date(a.date), new Date())).length;
  const weekApps = appointments.filter(a => {
    const appDate = new Date(a.date);
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    return appDate >= weekStart && appDate <= weekEnd;
  }).length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Top Operativo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-[#0c0c0c] p-6 rounded-[2.5rem] border border-white/5 shadow-2xl">
        <div className="flex items-center space-x-6">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]">
            <CalendarIcon size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Calendario Operativo</h1>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Sincronizzazione Talent & Brand</p>
          </div>
        </div>

        <div className="flex items-center bg-zinc-900/50 p-2 rounded-2xl border border-white/5">
          {(['month', 'week', 'day'] as ViewType[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === v ? 'bg-white text-black shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              {v === 'month' ? 'Mese' : v === 'week' ? 'Settimana' : 'Giorno'}
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-white transition-all">
            Oggi
          </button>
          <div className="flex items-center bg-zinc-950 px-4 py-2 rounded-xl border border-white/5">
            <button onClick={() => navigateDate('prev')} className="p-2 text-zinc-500 hover:text-white"><ChevronLeft size={20} /></button>
            <span className="px-4 font-black text-xs text-white uppercase tracking-widest min-w-[180px] text-center">
              {getDateLabel()}
            </span>
            <button onClick={() => navigateDate('next')} className="p-2 text-zinc-500 hover:text-white"><ChevronRight size={20} /></button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Oggi</p>
          <p className="text-3xl font-black text-white">{todayApps}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Questa Settimana</p>
          <p className="text-3xl font-black text-blue-500">{weekApps}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Totale Appuntamenti</p>
          <p className="text-3xl font-black text-emerald-500">{appointments.length}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Talent Attivi</p>
          <p className="text-3xl font-black text-purple-500">{talents.filter(t => t.status === 'active').length}</p>
        </div>
      </div>

      {/* Filtri Avanzati */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center space-x-3 bg-zinc-900/30 px-4 py-3 rounded-2xl border border-white/5">
          <Filter size={16} className="text-blue-500" />
          <select
            className="bg-transparent border-none text-[10px] font-black text-zinc-400 uppercase tracking-widest focus:ring-0 cursor-pointer outline-none"
            value={filters.talentId}
            onChange={e => setFilters({ ...filters, talentId: e.target.value })}
          >
            <option value="ALL">Tutti i Talent</option>
            {talents.map(t => <option key={t.id} value={t.id}>{t.stageName}</option>)}
          </select>
        </div>

        <div className="flex items-center space-x-3 bg-zinc-900/30 px-4 py-3 rounded-2xl border border-white/5">
          <select
            className="bg-transparent border-none text-[10px] font-black text-zinc-400 uppercase tracking-widest focus:ring-0 cursor-pointer outline-none"
            value={filters.type}
            onChange={e => setFilters({ ...filters, type: e.target.value })}
          >
            <option value="ALL">Tutte le Tipologie</option>
            {Object.values(AppointmentType).map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>

        <div className="flex-1 flex items-center bg-zinc-900/30 px-5 py-3 rounded-2xl border border-white/5 focus-within:border-blue-500/50 transition-all">
          <Search size={16} className="text-zinc-600 mr-3" />
          <input
            type="text"
            placeholder="CERCA BRAND O CLIENTE..."
            className="bg-transparent border-none text-[10px] font-black text-white placeholder-zinc-700 w-full focus:ring-0 uppercase tracking-widest outline-none"
            value={filters.brand}
            onChange={e => setFilters({ ...filters, brand: e.target.value })}
          />
        </div>
      </div>

      {/* Calendario Grid */}
      <div className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] overflow-hidden shadow-3xl relative">
        {/* SVG Decorative Background */}
        <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
          <svg width="400" height="400" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="100" cy="100" r="80" stroke="white" strokeWidth="1" strokeDasharray="10 10" />
            <rect x="60" y="60" width="80" height="80" stroke="white" strokeWidth="0.5" />
          </svg>
        </div>

        {view === 'month' && (
          <>
            <div className="grid grid-cols-7 bg-zinc-900/40 backdrop-blur-md relative z-10 border-b border-white/5">
              {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                <div key={day} className="py-6 text-center text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 relative z-10">
              {monthCalendarDays.map((day, idx) => {
                const dayApps = filteredAppointments.filter(app => isSameDay(new Date(app.date), day));
                const isToday = isSameDay(day, new Date());
                const currentMonth = isSameMonth(day, currentDate);

                return (
                  <div
                    key={idx}
                    className={`min-h-[160px] p-4 border-r border-b border-white/5 transition-all group hover:bg-zinc-800/30 ${!currentMonth ? 'opacity-20' : ''}`}
                  >
                    <div className="flex justify-between items-center mb-4">
                      <span className={`text-[11px] font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 group-hover:text-white'}`}>
                        {format(day, 'd')}
                      </span>
                      {dayApps.length > 0 && currentMonth && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </div>

                    <div className="space-y-2">
                      {dayApps.slice(0, 3).map(app => (
                        <motion.div
                          layoutId={app.id}
                          key={app.id}
                          onClick={() => setSelectedAppointment(app)}
                          className={`flex flex-col p-2 rounded-xl text-[9px] font-black border-l-2 cursor-pointer transition-all hover:translate-x-1 ${getTypeColor(app.type)}`}
                        >
                          <div className="flex items-center space-x-1 mb-0.5">
                            {getTypeIcon(app.type)}
                            <span className="truncate">{app.brand}</span>
                          </div>
                          <span className="text-white truncate">@{app.talentName}</span>
                        </motion.div>
                      ))}
                      {dayApps.length > 3 && (
                        <div className="text-[9px] font-black text-zinc-600 text-center">
                          +{dayApps.length - 3} altri
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'week' && (
          <>
            <div className="grid grid-cols-7 bg-zinc-900/40 backdrop-blur-md relative z-10 border-b border-white/5">
              {weekCalendarDays.map((day, idx) => {
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={idx} className={`py-6 text-center border-r border-white/5 last:border-0 ${isToday ? 'bg-blue-600/10' : ''}`}>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">{format(day, 'EEE', { locale: it })}</p>
                    <p className={`text-2xl font-black mt-2 ${isToday ? 'text-blue-500' : 'text-white'}`}>{format(day, 'd')}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-7 relative z-10 min-h-[500px]">
              {weekCalendarDays.map((day, idx) => {
                const dayApps = filteredAppointments.filter(app => isSameDay(new Date(app.date), day));
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={idx}
                    className={`p-4 border-r border-white/5 last:border-0 ${isToday ? 'bg-blue-600/5' : ''}`}
                  >
                    <div className="space-y-3">
                      {dayApps.map(app => (
                        <motion.div
                          key={app.id}
                          onClick={() => setSelectedAppointment(app)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] ${getTypeColor(app.type)}`}
                        >
                          <div className="flex items-center space-x-2 mb-2">
                            {getTypeIcon(app.type)}
                            <span className="text-[10px] font-black uppercase tracking-widest">{app.type}</span>
                          </div>
                          <h4 className="text-sm font-black text-white uppercase">{app.brand}</h4>
                          <p className="text-[10px] text-zinc-400 mt-1">@{app.talentName}</p>
                          <div className="flex items-center space-x-2 mt-3 text-[9px] text-zinc-500">
                            <Clock size={10} />
                            <span>{format(new Date(app.date), 'HH:mm')}</span>
                          </div>
                        </motion.div>
                      ))}
                      {dayApps.length === 0 && (
                        <div className="py-20 text-center opacity-20">
                          <CalendarIcon size={24} className="mx-auto" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {view === 'day' && (
          <div className="relative z-10">
            <div className="p-6 border-b border-white/5 bg-zinc-900/20">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Appuntamenti del giorno</p>
              <h2 className="text-2xl font-black text-white mt-1">{format(currentDate, 'EEEE d MMMM', { locale: it })}</h2>
            </div>
            <div className="divide-y divide-white/5">
              {dayHours.map((hour, idx) => {
                const hourApps = filteredAppointments.filter(app => {
                  const appDate = new Date(app.date);
                  return isSameDay(appDate, currentDate) && appDate.getHours() === hour.getHours();
                });

                return (
                  <div key={idx} className="flex min-h-[80px]">
                    <div className="w-24 p-4 text-right border-r border-white/5">
                      <span className="text-[11px] font-black text-zinc-600">{format(hour, 'HH:mm')}</span>
                    </div>
                    <div className="flex-1 p-4">
                      <div className="space-y-2">
                        {hourApps.map(app => (
                          <motion.div
                            key={app.id}
                            onClick={() => setSelectedAppointment(app)}
                            className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all hover:scale-[1.01] ${getTypeColor(app.type)}`}
                          >
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                {getTypeIcon(app.type)}
                              </div>
                              <div>
                                <h4 className="text-sm font-black text-white uppercase">{app.brand}</h4>
                                <p className="text-[10px] text-zinc-400">@{app.talentName} • {app.type}</p>
                              </div>
                            </div>
                            <ArrowUpRight size={16} className="text-zinc-600" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      <AnimatePresence>
        {selectedAppointment && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedAppointment(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] w-full max-w-md shadow-3xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${getTypeColor(selectedAppointment.type)}`}>
                    {selectedAppointment.type}
                  </span>
                  <button onClick={() => setSelectedAppointment(null)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
                    <X size={20} />
                  </button>
                </div>

                <h3 className="text-3xl font-black text-white uppercase tracking-tighter mb-2">{selectedAppointment.brand}</h3>
                <p className="text-zinc-500 font-bold">{selectedAppointment.description || 'Appuntamento programmato'}</p>

                <div className="mt-8 space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-zinc-900/50 rounded-2xl">
                    <User size={18} className="text-blue-500" />
                    <div>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Talent</p>
                      <p className="text-sm font-bold text-white">{selectedAppointment.talentName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 p-4 bg-zinc-900/50 rounded-2xl">
                    <CalendarIcon size={18} className="text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Data & Ora</p>
                      <p className="text-sm font-bold text-white">{format(new Date(selectedAppointment.date), 'EEEE d MMMM yyyy - HH:mm', { locale: it })}</p>
                    </div>
                  </div>
                  {selectedAppointment.deadline && (
                    <div className="flex items-center space-x-4 p-4 bg-red-500/10 rounded-2xl border border-red-500/20">
                      <Clock size={18} className="text-red-500" />
                      <div>
                        <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Scadenza Consegna</p>
                        <p className="text-sm font-bold text-white">{format(new Date(selectedAppointment.deadline), 'd MMMM yyyy', { locale: it })}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center space-x-4 p-4 bg-zinc-900/50 rounded-2xl">
                    <div className={`w-3 h-3 rounded-full ${selectedAppointment.status === 'completed' ? 'bg-emerald-500' : selectedAppointment.status === 'cancelled' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Status</p>
                      <p className="text-sm font-bold text-white capitalize">{selectedAppointment.status}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex space-x-4">
                  <button
                    onClick={() => {
                      navigate(`/roster/${selectedAppointment.talentId}`);
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-4 rounded-2xl transition-all"
                  >
                    Vai al Talent
                  </button>
                  <button
                    onClick={() => setSelectedAppointment(null)}
                    className="flex-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-black uppercase text-xs tracking-widest py-4 rounded-2xl transition-all"
                  >
                    Chiudi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
