
import React, { useState, useMemo } from 'react';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
    addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth
} from 'date-fns';
import { it } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    Video, Camera, Truck, MessageSquare, X,
    User, Briefcase, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Appointment, Collaboration, Campaign, AppointmentType, CollaborationStatus } from '../types';

interface TalentCalendarProps {
    talentId: string;
    appointments: Appointment[];
    collaborations: Collaboration[];
    campaigns: Campaign[];
}

const TalentCalendar: React.FC<TalentCalendarProps> = ({ talentId, appointments, collaborations, campaigns }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    // Filter items for the current talent
    const myAppointments = useMemo(() =>
        appointments.filter(a => a.talentId === talentId),
        [appointments, talentId]);

    const myCollaborations = useMemo(() =>
        collaborations.filter(c => c.talentId === talentId && c.status !== CollaborationStatus.CANCELLED),
        [collaborations, talentId]);

    // Calendar logic
    const monthCalendarDays = useMemo(() => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        return eachDayOfInterval({ start: startDate, end: endDate });
    }, [currentDate]);

    const navigateDate = (direction: 'prev' | 'next') => {
        setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    };

    const getTypeIcon = (type: AppointmentType | 'collaboration') => {
        switch (type) {
            case AppointmentType.SHOOTING: return <Camera size={12} />;
            case AppointmentType.PUBLICATION: return <Video size={12} />;
            case AppointmentType.CALL: return <MessageSquare size={12} />;
            case AppointmentType.DELIVERY: return <Truck size={12} />;
            case 'collaboration': return <Briefcase size={12} />;
            default: return <CalendarIcon size={12} />;
        }
    };

    const getDayItems = (day: Date) => {
        const apps = myAppointments.filter(app => isSameDay(new Date(app.date), day));
        const collabs = myCollaborations.filter(c => c.deadline && isSameDay(new Date(c.deadline), day));

        return [
            ...apps.map(a => ({ ...a, itemType: 'appointment' as const })),
            ...collabs.map(c => ({
                id: c.id,
                brand: c.brand,
                type: 'Scadenza Consegna',
                itemType: 'collaboration' as const,
                description: c.notes,
                status: c.status
            }))
        ];
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#0c0c0c] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl">
                <div className="flex items-center space-x-6">
                    <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-[0_0_30px_rgba(37,99,235,0.4)]">
                        <CalendarIcon size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white uppercase tracking-tighter leading-none">Il Mio Calendario</h1>
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Gestione scadenze e appuntamenti</p>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-white transition-all">
                        Oggi
                    </button>
                    <div className="flex items-center bg-zinc-950 px-4 py-2 rounded-xl border border-white/5">
                        <button onClick={() => navigateDate('prev')} className="p-2 text-zinc-500 hover:text-white transition-colors"><ChevronLeft size={20} /></button>
                        <span className="px-6 font-black text-xs text-white uppercase tracking-widest min-w-[200px] text-center">
                            {format(currentDate, 'MMMM yyyy', { locale: it })}
                        </span>
                        <button onClick={() => navigateDate('next')} className="p-2 text-zinc-500 hover:text-white transition-colors"><ChevronRight size={20} /></button>
                    </div>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] overflow-hidden shadow-3xl relative">
                <div className="grid grid-cols-7 bg-zinc-900/40 backdrop-blur-md relative z-10 border-b border-white/5">
                    {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                        <div key={day} className="py-6 text-center text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] font-sans">{day}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 relative z-10">
                    {monthCalendarDays.map((day, idx) => {
                        const dayItems = getDayItems(day);
                        const isToday = isSameDay(day, new Date());
                        const currentMonth = isSameMonth(day, currentDate);

                        return (
                            <div
                                key={idx}
                                onClick={() => dayItems.length > 0 && setSelectedDay(day)}
                                className={`min-h-[140px] p-4 border-r border-b border-white/5 transition-all group hover:bg-zinc-800/30 cursor-pointer ${!currentMonth ? 'opacity-20' : ''}`}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <span className={`text-[11px] font-black w-8 h-8 flex items-center justify-center rounded-xl transition-all ${isToday ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 group-hover:text-white'}`}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayItems.length > 0 && currentMonth && (
                                        <div className="flex space-x-1">
                                            {dayItems.some(i => i.itemType === 'collaboration') && <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" title="Scadenza" />}
                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    {dayItems.slice(0, 3).map((item, iIndex) => (
                                        <div
                                            key={iIndex}
                                            className={`px-2 py-1.5 rounded-lg text-[9px] font-black border-l-2 flex flex-col ${item.itemType === 'collaboration'
                                                    ? 'bg-red-500/10 border-red-500 text-red-500'
                                                    : 'bg-blue-500/10 border-blue-500 text-blue-400'
                                                }`}
                                        >
                                            <div className="flex items-center space-x-1">
                                                {getTypeIcon(item.itemType === 'appointment' ? (item as Appointment).type : 'collaboration')}
                                                <span className="truncate">{item.brand}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {dayItems.length > 3 && (
                                        <div className="text-[8px] font-black text-zinc-600 text-center uppercase tracking-tighter">
                                            + {dayItems.length - 3} altri
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Legend */}
            <div className="flex items-center space-x-8 px-8 py-4 bg-zinc-900/30 rounded-2xl border border-white/5 w-fit">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Appuntamenti</span>
                </div>
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Scadenze Collaborazioni</span>
                </div>
            </div>

            {/* Details Modal */}
            <AnimatePresence>
                {selectedDay && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedDay(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-lg"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-3xl overflow-hidden p-8"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter">{format(selectedDay, 'd MMMM yyyy', { locale: it })}</h3>
                                    <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Programma del giorno</p>
                                </div>
                                <button onClick={() => setSelectedDay(null)} className="p-3 hover:bg-zinc-900 rounded-2xl text-zinc-500 hover:text-white transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                                {getDayItems(selectedDay).map((item, idx) => (
                                    <div key={idx} className={`p-6 rounded-3xl border ${item.itemType === 'collaboration'
                                            ? 'bg-red-500/5 border-red-500/20'
                                            : 'bg-zinc-900/50 border-white/5'
                                        }`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center space-x-2 mb-1">
                                                    {item.itemType === 'collaboration' ? (
                                                        <div className="px-3 py-1 bg-red-500/10 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-red-500/20">
                                                            Scadenza
                                                        </div>
                                                    ) : (
                                                        <div className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-blue-500/20">
                                                            {(item as Appointment).type}
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="text-xl font-black text-white uppercase tracking-tight">{item.brand}</h4>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center">
                                                {getTypeIcon(item.itemType === 'appointment' ? (item as Appointment).type : 'collaboration')}
                                            </div>
                                        </div>

                                        {item.description && (
                                            <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-4">{item.description}</p>
                                        )}

                                        <div className="flex items-center space-x-6">
                                            {item.itemType === 'appointment' && (item as Appointment).location && (
                                                <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-400">
                                                    <Truck size={12} className="text-blue-500" />
                                                    <span>{(item as Appointment).location}</span>
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-2 text-[10px] font-bold text-zinc-400">
                                                <Bell size={12} className={item.itemType === 'collaboration' ? 'text-red-500' : 'text-zinc-600'} />
                                                <span className="uppercase tracking-widest">{item.itemType === 'collaboration' ? 'Entro il termine giornata' : 'Pianificato'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default TalentCalendar;
