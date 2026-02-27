
import React, { useState, useMemo, useCallback } from 'react';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
    addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth
} from 'date-fns';
import { it } from 'date-fns/locale';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    Video, Camera, Truck, MessageSquare,
    Briefcase, Bell, Clock, Flag
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AppointmentType } from '../types';
import { useApp } from '../context/AppContext';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { staggerContainer, staggerItem } from '@/lib/animations';

interface TalentCalendarProps {
    talentId: string;
}

interface CalendarItem {
    id: string;
    title: string;
    itemType: 'appointment' | 'campaign' | 'deadline';
    description?: string;
    location?: string;
    status?: string;
    appointmentType?: AppointmentType;
    campaignLabel?: string;
    brand?: string;
}

const TalentCalendar: React.FC<TalentCalendarProps> = ({ talentId }) => {
    const { campaignTalents, campaigns, appointments } = useApp();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    // My campaign talents & campaigns (same logic as TalentDashboard)
    const myCampaignTalents = useMemo(() =>
        campaignTalents.filter(ct => ct.talent_id === talentId),
        [campaignTalents, talentId]);

    const myCampaigns = useMemo(() => {
        const ids = new Set(myCampaignTalents.map(ct => ct.campaign_id));
        return campaigns.filter(c => ids.has(c.id));
    }, [campaigns, myCampaignTalents]);

    const myAppointments = useMemo(() =>
        appointments.filter(a => a.talentId === talentId),
        [appointments, talentId]);

    // Calendar grid days
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

    const getTypeIcon = (itemType: string, appointmentType?: AppointmentType) => {
        if (itemType === 'campaign') return <Briefcase size={12} />;
        if (itemType === 'deadline') return <Flag size={12} />;
        switch (appointmentType) {
            case AppointmentType.SHOOTING: return <Camera size={12} />;
            case AppointmentType.PUBLICATION: return <Video size={12} />;
            case AppointmentType.CALL: return <MessageSquare size={12} />;
            case AppointmentType.DELIVERY: return <Truck size={12} />;
            default: return <CalendarIcon size={12} />;
        }
    };

    const getDayItems = useCallback((day: Date): CalendarItem[] => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const items: CalendarItem[] = [];

        // Appointments
        myAppointments.forEach(app => {
            if (app.date === dayStr) {
                items.push({
                    id: `app-${app.id}`,
                    title: app.brand,
                    itemType: 'appointment',
                    appointmentType: app.type,
                    description: app.description,
                    location: app.location,
                    status: app.status,
                    brand: app.brand,
                });
            }
            if (app.deadline && app.deadline === dayStr) {
                items.push({
                    id: `app-dl-${app.id}`,
                    title: `Deadline: ${app.brand}`,
                    itemType: 'deadline',
                    description: `Scadenza ${app.type}`,
                    brand: app.brand,
                });
            }
        });

        // Campaign events
        myCampaigns.forEach(c => {
            if (c.data_inizio === dayStr) {
                items.push({
                    id: `camp-start-${c.id}`,
                    title: c.name,
                    itemType: 'campaign',
                    campaignLabel: 'Inizio',
                    description: c.brand ? `Inizio - ${c.brand}` : 'Inizio campagna',
                    brand: c.brand || c.name,
                });
            }
            if (c.data_fine === dayStr) {
                items.push({
                    id: `camp-end-${c.id}`,
                    title: c.name,
                    itemType: 'campaign',
                    campaignLabel: 'Fine',
                    description: c.brand ? `Fine - ${c.brand}` : 'Fine campagna',
                    brand: c.brand || c.name,
                });
            }
            if (c.deadline === dayStr) {
                items.push({
                    id: `camp-dl-${c.id}`,
                    title: `Deadline: ${c.name}`,
                    itemType: 'deadline',
                    campaignLabel: 'Deadline',
                    description: c.brand ? `Deadline - ${c.brand}` : 'Deadline campagna',
                    brand: c.brand || c.name,
                });
            }
        });

        return items;
    }, [myAppointments, myCampaigns]);

    const getItemColor = (itemType: string) => {
        switch (itemType) {
            case 'appointment': return { bg: 'bg-primary/10', border: 'border-primary', text: 'text-primary' };
            case 'campaign': return { bg: 'bg-purple-500/10', border: 'border-purple-500', text: 'text-purple-400' };
            case 'deadline': return { bg: 'bg-destructive/10', border: 'border-destructive', text: 'text-destructive' };
            default: return { bg: 'bg-primary/10', border: 'border-primary', text: 'text-primary' };
        }
    };

    const getBadgeVariant = (itemType: string): "default" | "destructive" | "secondary" => {
        switch (itemType) {
            case 'appointment': return 'default';
            case 'campaign': return 'secondary';
            case 'deadline': return 'destructive';
            default: return 'default';
        }
    };

    const getBadgeLabel = (item: CalendarItem) => {
        if (item.itemType === 'deadline') return 'Deadline';
        if (item.itemType === 'campaign') return item.campaignLabel || 'Campagna';
        return item.appointmentType || 'Appuntamento';
    };

    return (
        <AnimatedContainer className="space-y-8 pb-20">
            {/* Header */}
            <PageHeader
                title="Il Mio Calendario"
                subtitle="Gestione campagne, scadenze e appuntamenti"
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
                                            {dayItems.some(i => i.itemType === 'deadline') && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-destructive animate-pulse" />
                                            )}
                                            {dayItems.some(i => i.itemType === 'campaign') && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                                            )}
                                            {dayItems.some(i => i.itemType === 'appointment') && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    {dayItems.slice(0, 3).map((item) => {
                                        const colors = getItemColor(item.itemType);
                                        return (
                                            <div
                                                key={item.id}
                                                className={`px-2 py-1 rounded-md text-[9px] font-bold border-l-2 flex items-center gap-1 ${colors.bg} ${colors.border} ${colors.text}`}
                                            >
                                                {getTypeIcon(item.itemType, item.appointmentType)}
                                                <span className="truncate">
                                                    {item.campaignLabel ? `${item.campaignLabel}: ` : ''}{item.brand || item.title}
                                                </span>
                                            </div>
                                        );
                                    })}
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
            <GlassCard className="flex flex-wrap items-center gap-6 px-6 py-3 w-fit">
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Appuntamenti</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Campagne</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Deadline</span>
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
                        {selectedDay && getDayItems(selectedDay).map((item) => {
                            const colors = getItemColor(item.itemType);
                            return (
                                <GlassCard
                                    key={item.id}
                                    className={`p-5 ${item.itemType === 'deadline' ? 'border-destructive/20 bg-destructive/[0.04]' : item.itemType === 'campaign' ? 'border-purple-500/20 bg-purple-500/[0.04]' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1.5">
                                                <Badge variant={getBadgeVariant(item.itemType)}>
                                                    {getBadgeLabel(item)}
                                                </Badge>
                                            </div>
                                            <h4 className="text-lg font-black text-foreground tracking-tight">
                                                {item.brand || item.title}
                                            </h4>
                                        </div>
                                        <div className={`w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center ${colors.text}`}>
                                            {getTypeIcon(item.itemType, item.appointmentType)}
                                        </div>
                                    </div>

                                    {item.description && (
                                        <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                                            {item.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-4">
                                        {item.location && (
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                                <Truck size={12} className="text-primary" />
                                                <span>{item.location}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                                            <Bell size={12} className={item.itemType === 'deadline' ? 'text-destructive' : item.itemType === 'campaign' ? 'text-purple-400' : 'text-muted-foreground'} />
                                            <span className="uppercase tracking-widest">
                                                {item.itemType === 'deadline' ? 'Scadenza' : item.itemType === 'campaign' ? (item.campaignLabel || 'Campagna') : 'Pianificato'}
                                            </span>
                                        </div>
                                    </div>
                                </GlassCard>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </AnimatedContainer>
    );
};

export default TalentCalendar;
