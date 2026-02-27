
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
import { motion } from 'framer-motion';
import { Appointment, Collaboration, Campaign, AppointmentType, CollaborationStatus } from '../types';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { staggerContainer, staggerItem } from '@/lib/animations';

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
        <AnimatedContainer className="space-y-8 pb-20">
            {/* Header */}
            <PageHeader
                title="Il Mio Calendario"
                subtitle="Gestione scadenze e appuntamenti"
                actions={
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentDate(new Date())}
                        >
                            Oggi
                        </Button>
                        <div className="flex items-center gap-1 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-xl px-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigateDate('prev')}
                                className="h-8 w-8"
                            >
                                <ChevronLeft size={18} />
                            </Button>
                            <span className="px-4 font-bold text-xs text-white uppercase tracking-widest min-w-[180px] text-center">
                                {format(currentDate, 'MMMM yyyy', { locale: it })}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => navigateDate('next')}
                                className="h-8 w-8"
                            >
                                <ChevronRight size={18} />
                            </Button>
                        </div>
                    </div>
                }
            />

            {/* Calendar Grid */}
            <GlassCard variant="prominent" className="overflow-hidden rounded-3xl">
                {/* Day-of-week header */}
                <div className="grid grid-cols-7 border-b border-white/[0.06]">
                    {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                        <div
                            key={day}
                            className="py-4 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-[0.3em]"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar cells */}
                <motion.div
                    className="grid grid-cols-7"
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                >
                    {monthCalendarDays.map((day, idx) => {
                        const dayItems = getDayItems(day);
                        const isToday = isSameDay(day, new Date());
                        const currentMonth = isSameMonth(day, currentDate);

                        return (
                            <motion.div
                                key={idx}
                                variants={staggerItem}
                                onClick={() => dayItems.length > 0 && setSelectedDay(day)}
                                className={`
                                    min-h-[130px] p-3 border-r border-b border-white/[0.04]
                                    transition-all duration-200 group
                                    hover:bg-white/[0.04] cursor-pointer
                                    ${!currentMonth ? 'opacity-20' : ''}
                                `}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span
                                        className={`
                                            text-[11px] font-bold w-7 h-7 flex items-center justify-center rounded-lg transition-all
                                            ${isToday
                                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                                                : 'text-muted-foreground group-hover:text-foreground'
                                            }
                                        `}
                                    >
                                        {format(day, 'd')}
                                    </span>
                                    {dayItems.length > 0 && currentMonth && (
                                        <div className="flex gap-1">
                                            {dayItems.some(i => i.itemType === 'collaboration') && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" title="Scadenza" />
                                            )}
                                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    {dayItems.slice(0, 3).map((item, iIndex) => (
                                        <div
                                            key={iIndex}
                                            className={`
                                                px-2 py-1 rounded-md text-[9px] font-bold border-l-2 flex items-center gap-1
                                                ${item.itemType === 'collaboration'
                                                    ? 'bg-destructive/10 border-destructive text-destructive'
                                                    : 'bg-primary/10 border-primary text-primary'
                                                }
                                            `}
                                        >
                                            {getTypeIcon(item.itemType === 'appointment' ? (item as Appointment).type : 'collaboration')}
                                            <span className="truncate">{item.brand}</span>
                                        </div>
                                    ))}
                                    {dayItems.length > 3 && (
                                        <div className="text-[8px] font-bold text-muted-foreground text-center uppercase tracking-tight">
                                            + {dayItems.length - 3} altri
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </GlassCard>

            {/* Legend */}
            <GlassCard className="flex items-center gap-8 px-6 py-3 w-fit">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Appuntamenti</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Scadenze Collaborazioni</span>
                </div>
            </GlassCard>

            {/* Details Dialog */}
            <Dialog open={!!selectedDay} onOpenChange={(open) => !open && setSelectedDay(null)}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight">
                            {selectedDay && format(selectedDay, 'd MMMM yyyy', { locale: it })}
                        </DialogTitle>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Programma del giorno
                        </p>
                    </DialogHeader>

                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                        {selectedDay && getDayItems(selectedDay).map((item, idx) => (
                            <GlassCard
                                key={idx}
                                variant={item.itemType === 'collaboration' ? 'default' : 'default'}
                                className={`p-5 ${item.itemType === 'collaboration'
                                    ? 'border-destructive/20 bg-destructive/[0.04]'
                                    : ''
                                }`}
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {item.itemType === 'collaboration' ? (
                                                <Badge variant="destructive">Scadenza</Badge>
                                            ) : (
                                                <Badge variant="default">{(item as Appointment).type}</Badge>
                                            )}
                                        </div>
                                        <h4 className="text-lg font-black text-foreground tracking-tight">
                                            {item.brand}
                                        </h4>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-muted-foreground">
                                        {getTypeIcon(item.itemType === 'appointment' ? (item as Appointment).type : 'collaboration')}
                                    </div>
                                </div>

                                {item.description && (
                                    <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                                        {item.description}
                                    </p>
                                )}

                                <div className="flex items-center gap-4">
                                    {item.itemType === 'appointment' && (item as Appointment).location && (
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                            <Truck size={12} className="text-primary" />
                                            <span>{(item as Appointment).location}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                        <Bell size={12} className={item.itemType === 'collaboration' ? 'text-destructive' : 'text-muted-foreground'} />
                                        <span className="uppercase tracking-widest">
                                            {item.itemType === 'collaboration' ? 'Entro il termine giornata' : 'Pianificato'}
                                        </span>
                                    </div>
                                </div>
                            </GlassCard>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </AnimatedContainer>
    );
};

export default TalentCalendar;
