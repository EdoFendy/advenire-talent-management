
import React, { useState, useMemo, useCallback } from 'react';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, startOfWeek, endOfWeek, isSameMonth, addDays,
  isToday as isDateToday, isBefore, startOfDay, parseISO, isWithinInterval
} from 'date-fns';
import { it } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, Plus, Check, Trash2, X,
  AlertTriangle, Clock, Calendar as CalendarIcon, Flag,
  StickyNote, Pencil, Maximize2, Minimize2, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Task, TaskStatus, TaskPriority } from '../types';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { staggerContainer, staggerItem } from '@/lib/animations';

const PRIORITY_LABELS: Record<string, string> = { low: 'Bassa', normal: 'Normale', high: 'Alta', urgent: 'Urgente' };
const PRIORITY_COLORS: Record<string, string> = { low: 'text-zinc-500', normal: 'text-blue-400', high: 'text-amber-400', urgent: 'text-red-400' };
const STATUS_LABELS: Record<string, string> = { todo: 'Da fare', in_progress: 'In corso', done: 'Completata' };

const QuickAdd: React.FC<{ placeholder?: string; onAdd: (title: string) => void }> = ({ placeholder = 'Aggiungi attività...', onAdd }) => {
  const [value, setValue] = useState('');
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) { onAdd(value.trim()); setValue(''); }
  };
  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
      <Input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} className="flex-1 h-9 text-xs" />
      <Button type="submit" disabled={!value.trim()} size="icon" className="h-9 w-9 shrink-0">
        <Plus size={14} />
      </Button>
    </form>
  );
};

const TaskItem: React.FC<{ task: Task; onToggle: () => void; onClick: () => void }> = ({ task, onToggle, onClick }) => (
  <motion.div
    variants={staggerItem}
    className={`group flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-white/[0.03] cursor-pointer ${
      task.status === 'done' ? 'border-white/[0.04] opacity-50'
        : task.priority === 'urgent' ? 'border-red-500/20 bg-red-500/[0.03]'
        : 'border-white/[0.06]'
    }`}
  >
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
        task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-white/[0.15] hover:border-primary'
      }`}
    >
      {task.status === 'done' && <Check size={12} className="text-white" />}
    </button>
    <div className="flex-1 min-w-0" onClick={onClick}>
      <p className={`text-xs font-semibold truncate ${task.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {task.title}
      </p>
      {task.description && <p className="text-[10px] text-muted-foreground truncate mt-0.5">{task.description}</p>}
    </div>
    <Flag size={12} className={`shrink-0 ${PRIORITY_COLORS[task.priority] || 'text-muted-foreground'}`} />
  </motion.div>
);

const TaskSection: React.FC<{
  title: string; icon: React.ReactNode; tasks: Task[]; emptyMessage?: string;
  onQuickAdd: (title: string) => void; onToggleTask: (task: Task) => void; onClickTask: (task: Task) => void;
  accentColor?: string;
}> = ({ title, icon, tasks, emptyMessage = 'Nessuna attività', onQuickAdd, onToggleTask, onClickTask, accentColor = 'text-primary' }) => (
  <GlassCard className="p-4">
    <div className="flex items-center gap-2 mb-3">
      <span className={accentColor}>{icon}</span>
      <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">{title}</h3>
      {tasks.length > 0 && <Badge variant="glass" className="ml-auto">{tasks.length}</Badge>}
    </div>
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
      {tasks.length === 0 ? (
        <p className="text-[10px] text-muted-foreground py-4 text-center italic">{emptyMessage}</p>
      ) : tasks.map(task => (
        <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(task)} onClick={() => onClickTask(task)} />
      ))}
    </motion.div>
    <QuickAdd onAdd={onQuickAdd} />
  </GlassCard>
);

interface CalendarEvent {
  id: string; title: string; type: 'task' | 'campaign' | 'appointment'; date: string; color: string;
  priority?: string; status?: string; campaignType?: string; appointmentType?: string; description?: string;
  isStart?: boolean; isEnd?: boolean; isOngoing?: boolean;
}

interface DashboardProps { appointments: any[]; talents: any[]; collaborations: any[] }

const Dashboard: React.FC<DashboardProps> = () => {
  const { tasks, addTask, updateTask, deleteTask, homeNote, updateHomeNote, campaigns, appointments, campaignTalents, talents } = useApp();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskDefaults, setNewTaskDefaults] = useState<{ date?: string; priority?: TaskPriority }>({});
  const [noteText, setNoteText] = useState(homeNote?.note_text || '');
  const [noteEditing, setNoteEditing] = useState(false);
  const [urgentSubTab, setUrgentSubTab] = useState<'urgent' | 'week'>('urgent');
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<Date | null>(null);
  const [calendarFilters, setCalendarFilters] = useState({ status: 'ALL', priority: 'ALL', eventType: 'ALL' });

  // Task modal state
  const [modalTitle, setModalTitle] = useState('');
  const [modalDesc, setModalDesc] = useState('');
  const [modalDate, setModalDate] = useState('');
  const [modalStatus, setModalStatus] = useState<TaskStatus>(TaskStatus.TODO);
  const [modalPriority, setModalPriority] = useState<TaskPriority>(TaskPriority.LOW);

  React.useEffect(() => {
    if (homeNote?.note_text && !noteEditing) setNoteText(homeNote.note_text);
  }, [homeNote?.note_text]);

  // Open task modal
  const openTaskModal = useCallback((task: Task | null, defaults?: { date?: string; priority?: TaskPriority }) => {
    setModalTitle(task?.title || '');
    setModalDesc(task?.description || '');
    setModalDate(task?.due_date || defaults?.date || format(new Date(), 'yyyy-MM-dd'));
    setModalStatus(task?.status as TaskStatus || TaskStatus.TODO);
    setModalPriority(task?.priority as TaskPriority || defaults?.priority || TaskPriority.LOW);
    if (task) setSelectedTask(task); else setShowNewTaskModal(true);
  }, []);

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const tomorrow = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), []);
  const dayAfterTomorrow = useMemo(() => format(addDays(new Date(), 2), 'yyyy-MM-dd'), []);
  const nextWeekEnd = useMemo(() => format(addDays(new Date(), 7), 'yyyy-MM-dd'), []);

  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);
  const todayTasks = useMemo(() => activeTasks.filter(t => t.due_date === today), [activeTasks, today]);
  const tomorrowTasks = useMemo(() => activeTasks.filter(t => t.due_date === tomorrow), [activeTasks, tomorrow]);
  const dayAfterTomorrowTasks = useMemo(() => activeTasks.filter(t => t.due_date === dayAfterTomorrow), [activeTasks, dayAfterTomorrow]);
  const urgentTasks = useMemo(() => activeTasks.filter(t => t.priority === 'urgent' || (t.due_date && t.due_date < today)), [activeTasks, today]);
  const nextWeekTasks = useMemo(() => activeTasks.filter(t => t.due_date && t.due_date >= today && t.due_date <= nextWeekEnd), [activeTasks, today, nextWeekEnd]);

  const getCampaignEventsForDay = useCallback((dayStr: string) => {
    const events: { id: string; label: string; campaignName: string; talentName: string; type: 'start' | 'end' | 'deadline'; isUrgent: boolean }[] = [];
    campaigns.forEach(c => {
      if (c.status !== 'Attiva' && c.status !== 'Chiusa') return;
      if (c.data_inizio?.startsWith(dayStr)) events.push({ id: `cs-${c.id}`, label: 'Inizio', campaignName: c.name, talentName: '', type: 'start', isUrgent: false });
      if (c.data_fine?.startsWith(dayStr)) events.push({ id: `ce-${c.id}`, label: 'Fine', campaignName: c.name, talentName: '', type: 'end', isUrgent: false });
      if (c.deadline?.startsWith(dayStr)) events.push({ id: `cd-${c.id}`, label: 'Deadline', campaignName: c.name, talentName: '', type: 'deadline', isUrgent: true });
    });
    campaignTalents.forEach(ct => {
      if (ct.deadline?.startsWith(dayStr)) {
        const campaign = campaigns.find(c => c.id === ct.campaign_id);
        const talent = talents.find(t => t.id === ct.talent_id);
        if (campaign) events.push({ id: `ctd-${ct.id}`, label: `Deadline ${talent?.firstName || 'Talent'}`, campaignName: campaign.name, talentName: talent ? `${talent.firstName} ${talent.lastName}` : '', type: 'deadline', isUrgent: true });
      }
    });
    return events;
  }, [campaigns, campaignTalents, talents]);

  const urgentCampaigns = useMemo(() => campaigns.filter(c => {
    if (c.status !== 'Attiva' || !c.deadline) return false;
    return isBefore(parseISO(c.deadline), addDays(new Date(), 2));
  }), [campaigns]);

  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];
    if (calendarFilters.eventType === 'ALL' || calendarFilters.eventType === 'task') {
      tasks.forEach(t => {
        if (calendarFilters.status !== 'ALL' && t.status !== calendarFilters.status) return;
        if (calendarFilters.priority !== 'ALL' && t.priority !== calendarFilters.priority) return;
        if (!t.due_date) return;
        events.push({ id: `task-${t.id}`, title: t.title, type: 'task', date: t.due_date, color: t.priority === 'urgent' ? 'bg-red-400' : t.priority === 'high' ? 'bg-amber-400' : t.status === 'done' ? 'bg-emerald-500' : 'bg-blue-400', priority: t.priority, status: t.status, description: t.description });
      });
    }
    if (calendarFilters.eventType === 'ALL' || calendarFilters.eventType === 'campaign') {
      campaigns.forEach(c => {
        if (c.data_inizio) events.push({ id: `camp-start-${c.id}`, title: c.name, type: 'campaign', date: c.data_inizio, color: 'bg-purple-500', campaignType: c.tipo, status: c.status, isStart: true, description: `Inizio campagna${c.brand ? ` - ${c.brand}` : ''}` });
        if (c.data_fine) events.push({ id: `camp-end-${c.id}`, title: c.name, type: 'campaign', date: c.data_fine, color: 'bg-purple-500', campaignType: c.tipo, status: c.status, isEnd: true, description: `Fine campagna${c.brand ? ` - ${c.brand}` : ''}` });
        if (c.deadline) events.push({ id: `camp-deadline-${c.id}`, title: `Deadline: ${c.name}`, type: 'campaign', date: c.deadline, color: 'bg-red-500', campaignType: c.tipo, status: c.status, description: `Deadline campagna${c.brand ? ` - ${c.brand}` : ''}` });
      });
    }
    if (calendarFilters.eventType === 'ALL' || calendarFilters.eventType === 'appointment') {
      appointments.forEach(a => {
        if (!a.date) return;
        events.push({ id: `app-${a.id}`, title: `${a.type}: ${a.brand || a.talentName}`, type: 'appointment', date: a.date, color: 'bg-amber-400', appointmentType: a.type, status: a.status, description: a.description || `${a.type}${a.location ? ` @ ${a.location}` : ''}` });
        if (a.deadline) events.push({ id: `app-deadline-${a.id}`, title: `Deadline: ${a.brand || a.talentName}`, type: 'appointment', date: a.deadline, color: 'bg-red-400', appointmentType: a.type, description: `Scadenza ${a.type}` });
      });
    }
    return events;
  }, [tasks, campaigns, appointments, calendarFilters]);

  const getEventsForDay = useCallback((dateStr: string) => calendarEvents.filter(e => e.date === dateStr), [calendarEvents]);

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    return eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 }) });
  }, [currentMonth]);

  const handleQuickAdd = useCallback(async (title: string, dueDate: string, priority: TaskPriority = TaskPriority.LOW) => {
    await addTask({ title, due_date: dueDate, status: TaskStatus.TODO, priority } as any);
  }, [addTask]);

  const handleToggleTask = useCallback(async (task: Task) => {
    await updateTask(task.id, { status: task.status === 'done' ? TaskStatus.TODO : TaskStatus.DONE });
  }, [updateTask]);

  const handleSaveTask = useCallback(async () => {
    if (!modalTitle.trim()) return;
    const data = { title: modalTitle.trim(), description: modalDesc.trim() || undefined, due_date: modalDate, status: modalStatus, priority: modalPriority };
    if (selectedTask) await updateTask(selectedTask.id, data);
    else await addTask(data as any);
    setSelectedTask(null);
    setShowNewTaskModal(false);
  }, [selectedTask, modalTitle, modalDesc, modalDate, modalStatus, modalPriority, updateTask, addTask]);

  const handleDeleteTask = useCallback(async () => {
    if (selectedTask) { await deleteTask(selectedTask.id); setSelectedTask(null); }
  }, [selectedTask, deleteTask]);

  const handleSaveNote = useCallback(async () => {
    await updateHomeNote(noteText);
    setNoteEditing(false);
  }, [noteText, updateHomeNote]);

  const handleCalendarDayClick = useCallback((day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEvents = getEventsForDay(dateStr);
    if (dayEvents.length > 0) setSelectedCalendarDay(day);
    else { setNewTaskDefaults({ date: dateStr }); openTaskModal(null, { date: dateStr }); }
  }, [getEventsForDay, openTaskModal]);

  const isTaskModalOpen = selectedTask !== null || showNewTaskModal;

  return (
    <AnimatedContainer className="space-y-6">
      <PageHeader
        title="Home"
        subtitle={format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}
        actions={
          <Button onClick={() => openTaskModal(null)} size="sm">
            <Plus size={14} /> Nuova Attività
          </Button>
        }
      />

      <div className={`grid grid-cols-1 gap-6 ${calendarExpanded ? '' : 'lg:grid-cols-[1fr_400px]'}`}>
        {!calendarExpanded && (
          <div className="space-y-4">
            <TaskSection title="Oggi" icon={<CalendarIcon size={16} />} tasks={todayTasks} emptyMessage="Nessuna attività per oggi"
              onQuickAdd={(t) => handleQuickAdd(t, today)} onToggleTask={handleToggleTask} onClickTask={(t) => openTaskModal(t)} accentColor="text-primary" />

            {getCampaignEventsForDay(today).length > 0 && (
              <GlassCard className="p-4 border-purple-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={14} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Campagne Oggi</span>
                  <Badge variant="glass" className="ml-auto">{getCampaignEventsForDay(today).length}</Badge>
                </div>
                <div className="space-y-1.5">
                  {getCampaignEventsForDay(today).map(evt => (
                    <div key={evt.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-purple-500/10 bg-purple-500/[0.03] hover:bg-purple-500/[0.06] transition-all">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${evt.type === 'deadline' ? 'bg-red-400' : 'bg-purple-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{evt.campaignName}</p>
                        <p className="text-[10px] text-purple-400/70 truncate">{evt.label}{evt.talentName ? ` — ${evt.talentName}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <TaskSection title="Domani" icon={<Clock size={16} />} tasks={tomorrowTasks} emptyMessage="Nessuna attività per domani"
              onQuickAdd={(t) => handleQuickAdd(t, tomorrow)} onToggleTask={handleToggleTask} onClickTask={(t) => openTaskModal(t)} accentColor="text-emerald-500" />

            {getCampaignEventsForDay(tomorrow).length > 0 && (
              <GlassCard className="p-4 border-purple-500/10">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={14} className="text-purple-400" />
                  <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">Campagne Domani</span>
                  <Badge variant="glass" className="ml-auto">{getCampaignEventsForDay(tomorrow).length}</Badge>
                </div>
                <div className="space-y-1.5">
                  {getCampaignEventsForDay(tomorrow).map(evt => (
                    <div key={evt.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-purple-500/10 bg-purple-500/[0.03] hover:bg-purple-500/[0.06] transition-all">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${evt.type === 'deadline' ? 'bg-red-400' : 'bg-purple-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground truncate">{evt.campaignName}</p>
                        <p className="text-[10px] text-purple-400/70 truncate">{evt.label}{evt.talentName ? ` — ${evt.talentName}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            <TaskSection title="Dopodomani" icon={<Clock size={16} />} tasks={dayAfterTomorrowTasks} emptyMessage="Nessuna attività per dopodomani"
              onQuickAdd={(t) => handleQuickAdd(t, dayAfterTomorrow)} onToggleTask={handleToggleTask} onClickTask={(t) => openTaskModal(t)} accentColor="text-purple-500" />

            {/* Urgenze & Next Week */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-400" />
                <h3 className="text-[11px] font-bold text-foreground uppercase tracking-widest">Urgenze & Prossima Settimana</h3>
              </div>

              <div className="flex gap-1 mb-3 bg-white/[0.02] p-1 rounded-xl">
                <button onClick={() => setUrgentSubTab('urgent')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${urgentSubTab === 'urgent' ? 'bg-red-500/15 text-red-400' : 'text-muted-foreground hover:text-foreground'}`}>
                  Urgenti ({urgentTasks.length + urgentCampaigns.length})
                </button>
                <button onClick={() => setUrgentSubTab('week')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${urgentSubTab === 'week' ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  7 Giorni ({nextWeekTasks.length})
                </button>
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                {urgentSubTab === 'urgent' ? (
                  urgentTasks.length === 0 && urgentCampaigns.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground py-4 text-center italic">Nessuna urgenza</p>
                  ) : (
                    <>
                      {urgentTasks.map(task => (
                        <TaskItem key={task.id} task={task} onToggle={() => handleToggleTask(task)} onClick={() => openTaskModal(task)} />
                      ))}
                      {urgentCampaigns.map(c => (
                        <div key={`uc-${c.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.03]">
                          <div className="w-5 h-5 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                            <Briefcase size={12} className="text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground truncate">{c.name}</p>
                            <p className="text-[10px] text-red-400/70 truncate">Deadline: {c.deadline ? format(parseISO(c.deadline), 'd MMM', { locale: it }) : 'N/D'}</p>
                          </div>
                          <Badge variant="destructive">Campagna</Badge>
                        </div>
                      ))}
                    </>
                  )
                ) : (
                  nextWeekTasks.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground py-4 text-center italic">Nessuna attività nei prossimi 7 giorni</p>
                  ) : nextWeekTasks.map(task => (
                    <TaskItem key={task.id} task={task} onToggle={() => handleToggleTask(task)} onClick={() => openTaskModal(task)} />
                  ))
                )}
              </div>

              <QuickAdd onAdd={(title) => handleQuickAdd(title, today, TaskPriority.URGENT)} />

              {/* Pinned Notes */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote size={14} className="text-amber-400" />
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Note Fissate</span>
                  </div>
                  {!noteEditing ? (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setNoteEditing(true)}>
                      <Pencil size={12} />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] text-primary" onClick={handleSaveNote}>Salva</Button>
                  )}
                </div>
                {noteEditing ? (
                  <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Scrivi le tue note qui..." rows={4} autoFocus />
                ) : (
                  <div onClick={() => setNoteEditing(true)}
                    className="min-h-[60px] bg-white/[0.02] rounded-xl px-3 py-2 text-xs text-muted-foreground cursor-pointer hover:bg-white/[0.04] transition-all whitespace-pre-wrap">
                    {noteText || <span className="italic">Clicca per aggiungere note...</span>}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* Calendar */}
        <div className={`space-y-4 ${calendarExpanded ? 'col-span-full' : ''}`}>
          <GlassCard className={`p-4 ${calendarExpanded ? '' : 'md:sticky md:top-20'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft size={16} />
                </Button>
                <span className="text-xs font-bold text-foreground uppercase tracking-wider px-2">
                  {format(currentMonth, 'MMMM yyyy', { locale: it })}
                </span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight size={16} />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalendarExpanded(!calendarExpanded)}>
                {calendarExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <select value={calendarFilters.eventType} onChange={e => setCalendarFilters(p => ({ ...p, eventType: e.target.value }))}
                className="flex-1 min-w-[100px] bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase focus:outline-none">
                <option value="ALL">Tutto</option>
                <option value="task">Attività</option>
                <option value="campaign">Campagne</option>
                <option value="appointment">Appuntamenti</option>
              </select>
              <select value={calendarFilters.status} onChange={e => setCalendarFilters(p => ({ ...p, status: e.target.value }))}
                className="flex-1 min-w-[100px] bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase focus:outline-none">
                <option value="ALL">Tutti stati</option>
                <option value="todo">Da fare</option>
                <option value="in_progress">In corso</option>
                <option value="done">Completate</option>
              </select>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'].map(d => (
                <div key={d} className="text-center text-[9px] font-bold text-muted-foreground uppercase tracking-widest py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = getEventsForDay(dateStr);
                const isToday = isDateToday(day);
                const inMonth = isSameMonth(day, currentMonth);
                const hasOngoing = inMonth && (calendarFilters.eventType === 'ALL' || calendarFilters.eventType === 'campaign') &&
                  campaigns.some(c => {
                    if (!c.data_inizio || !c.data_fine) return false;
                    try { return isWithinInterval(day, { start: parseISO(c.data_inizio), end: parseISO(c.data_fine) }); } catch { return false; }
                  });

                return (
                  <div key={idx} onClick={() => handleCalendarDayClick(day)}
                    className={`relative cursor-pointer rounded-lg transition-all hover:bg-white/[0.04] ${!inMonth ? 'opacity-20' : ''} ${hasOngoing ? 'bg-purple-500/[0.04]' : ''} ${
                      calendarExpanded ? 'min-h-[90px] p-2 border-r border-b border-white/[0.04]' : 'p-1.5 text-center'
                    }`}>
                    <span className={`text-[11px] font-bold flex items-center justify-center rounded-lg w-7 h-7 ${calendarExpanded ? '' : 'mx-auto'} ${
                      isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                    }`}>{format(day, 'd')}</span>

                    {calendarExpanded && inMonth && (
                      <div className="space-y-1 mt-1">
                        {dayEvents.slice(0, 3).map((evt, i) => (
                          <div key={i} className={`px-1.5 py-0.5 rounded text-[8px] font-semibold truncate border-l-2 ${
                            evt.type === 'campaign' ? 'bg-purple-500/10 border-purple-500 text-purple-400' :
                            evt.type === 'appointment' ? 'bg-amber-500/10 border-amber-500 text-amber-400' :
                            evt.priority === 'urgent' ? 'bg-red-500/10 border-red-500 text-red-400' :
                            'bg-blue-500/10 border-blue-500 text-blue-400'
                          }`}>{evt.title}</div>
                        ))}
                        {dayEvents.length > 3 && <p className="text-[7px] text-muted-foreground font-bold text-center">+{dayEvents.length - 3}</p>}
                      </div>
                    )}
                    {!calendarExpanded && dayEvents.length > 0 && inMonth && (
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {dayEvents.slice(0, 4).map((evt, i) => <div key={i} className={`w-1.5 h-1.5 rounded-full ${evt.color}`} />)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/[0.06]">
              {[
                { color: 'bg-blue-400', label: 'Attività' },
                { color: 'bg-purple-500', label: 'Campagne' },
                { color: 'bg-amber-400', label: 'Appuntamenti' },
                { color: 'bg-red-400', label: 'Urgenze' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${l.color}`} />
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{l.label}</span>
                </div>
              ))}
            </div>

            {/* Today's events preview */}
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Oggi ({getEventsForDay(today).length} eventi)
              </p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                {getEventsForDay(today).length === 0 ? (
                  <p className="text-[10px] text-muted-foreground py-3 text-center italic">Nessun evento per oggi</p>
                ) : getEventsForDay(today).map(evt => (
                  <div key={evt.id} onClick={() => evt.type === 'task' ? openTaskModal(tasks.find(t => `task-${t.id}` === evt.id) || null) : undefined}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer hover:bg-white/[0.03] ${
                      evt.type === 'campaign' ? 'border-purple-500/20 bg-purple-500/[0.03]' :
                      evt.type === 'appointment' ? 'border-amber-500/20 bg-amber-500/[0.03]' : 'border-white/[0.06]'
                    }`}>
                    <div className={`w-2 h-2 rounded-full shrink-0 ${evt.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{evt.title}</p>
                      {evt.description && <p className="text-[10px] text-muted-foreground truncate">{evt.description}</p>}
                    </div>
                    <Badge variant="glass">
                      {evt.type === 'campaign' ? 'Campagna' : evt.type === 'appointment' ? 'Appunt.' : 'Task'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Calendar Day Detail Dialog */}
      <Dialog open={selectedCalendarDay !== null} onOpenChange={(open) => !open && setSelectedCalendarDay(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div>
                <div className="text-lg font-bold">{selectedCalendarDay && format(selectedCalendarDay, 'd MMMM yyyy', { locale: it })}</div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                  {selectedCalendarDay && format(selectedCalendarDay, 'EEEE', { locale: it })}
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
            {selectedCalendarDay && getEventsForDay(format(selectedCalendarDay, 'yyyy-MM-dd')).map(evt => (
              <div key={evt.id} className={`p-4 rounded-2xl border ${
                evt.type === 'campaign' ? 'bg-purple-500/5 border-purple-500/20' :
                evt.type === 'appointment' ? 'bg-amber-500/5 border-amber-500/20' :
                evt.priority === 'urgent' ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/[0.06]'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={evt.type === 'campaign' ? 'default' : evt.type === 'appointment' ? 'warning' : 'default'}>
                    {evt.type === 'campaign' ? (evt.isStart ? 'Inizio' : evt.isEnd ? 'Fine' : 'Deadline') :
                     evt.type === 'appointment' ? (evt.appointmentType || 'Appuntamento') : 'Attività'}
                  </Badge>
                  {evt.priority && <Flag size={10} className={PRIORITY_COLORS[evt.priority]} />}
                </div>
                <p className="text-sm font-semibold text-foreground">{evt.title}</p>
                {evt.description && <p className="text-xs text-muted-foreground mt-1">{evt.description}</p>}
              </div>
            ))}
          </div>
          <Button onClick={() => {
            if (selectedCalendarDay) {
              const dateStr = format(selectedCalendarDay, 'yyyy-MM-dd');
              setSelectedCalendarDay(null);
              openTaskModal(null, { date: dateStr });
            }
          }} variant="outline" className="w-full">
            <Plus size={14} /> Aggiungi attività
          </Button>
        </DialogContent>
      </Dialog>

      {/* Task Detail/New Dialog */}
      <Dialog open={isTaskModalOpen} onOpenChange={(open) => { if (!open) { setSelectedTask(null); setShowNewTaskModal(false); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Dettagli Attività' : 'Nuova Attività'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titolo *</Label>
              <Input value={modalTitle} onChange={e => setModalTitle(e.target.value)} placeholder="Titolo attività..." autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Descrizione</Label>
              <Textarea value={modalDesc} onChange={e => setModalDesc(e.target.value)} placeholder="Descrizione opzionale..." rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={modalDate} onChange={e => setModalDate(e.target.value)} className="text-xs" />
              </div>
              <div className="space-y-2">
                <Label>Stato</Label>
                <select value={modalStatus} onChange={e => setModalStatus(e.target.value as TaskStatus)}
                  className="w-full h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Priorità</Label>
                <select value={modalPriority} onChange={e => setModalPriority(e.target.value as TaskPriority)}
                  className="w-full h-10 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 text-xs text-foreground focus:outline-none focus:border-primary/50">
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSaveTask} disabled={!modalTitle.trim()} className="flex-1">
                {selectedTask ? 'Salva Modifiche' : 'Crea Attività'}
              </Button>
              {selectedTask && (
                <Button variant="destructive" size="icon" onClick={handleDeleteTask}>
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AnimatedContainer>
  );
};

export default Dashboard;
