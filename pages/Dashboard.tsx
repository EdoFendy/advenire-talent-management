
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
  StickyNote, GripVertical, Pencil, Maximize2, Minimize2,
  Briefcase, Camera, Video, MessageSquare, Truck, Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { Task, TaskStatus, TaskPriority, Campaign, Appointment, AppointmentType } from '../types';

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Bassa',
  normal: 'Normale',
  high: 'Alta',
  urgent: 'Urgente'
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-zinc-500',
  normal: 'text-blue-400',
  high: 'text-amber-400',
  urgent: 'text-red-400'
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Da fare',
  in_progress: 'In corso',
  done: 'Completata'
};

// Quick-add component for each column
const QuickAdd: React.FC<{
  placeholder?: string;
  onAdd: (title: string) => void;
}> = ({ placeholder = 'Aggiungi attivita...', onAdd }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
      <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-zinc-900/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none transition-all"
      />
      <button
        type="submit"
        disabled={!value.trim()}
        className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-xl transition-all"
      >
        <Plus size={14} />
      </button>
    </form>
  );
};

// Single task item
const TaskItem: React.FC<{
  task: Task;
  onToggle: () => void;
  onClick: () => void;
}> = ({ task, onToggle, onClick }) => {
  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-xl border transition-all hover:bg-white/[0.02] cursor-pointer ${
        task.status === 'done'
          ? 'border-white/5 opacity-50'
          : task.priority === 'urgent'
          ? 'border-red-500/20 bg-red-500/[0.03]'
          : 'border-white/5'
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
          task.status === 'done'
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-zinc-600 hover:border-blue-500'
        }`}
      >
        {task.status === 'done' && <Check size={12} className="text-white" />}
      </button>

      <div className="flex-1 min-w-0" onClick={onClick}>
        <p className={`text-xs font-bold truncate ${task.status === 'done' ? 'line-through text-zinc-600' : 'text-white'}`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-[10px] text-zinc-600 truncate mt-0.5">{task.description}</p>
        )}
      </div>

      <Flag size={12} className={`flex-shrink-0 ${PRIORITY_COLORS[task.priority] || 'text-zinc-600'}`} />
    </div>
  );
};

// Task detail modal
const TaskModal: React.FC<{
  task: Task | null;
  isNew?: boolean;
  defaultDate?: string;
  defaultPriority?: TaskPriority;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
  onDelete?: () => void;
}> = ({ task, isNew, defaultDate, defaultPriority, onClose, onSave, onDelete }) => {
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [dueDate, setDueDate] = useState(task?.due_date || defaultDate || format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<TaskStatus>(task?.status || TaskStatus.TODO);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority || defaultPriority || TaskPriority.LOW);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      due_date: dueDate,
      status,
      priority
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-lg"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-lg shadow-3xl overflow-hidden"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-white uppercase tracking-tight">
              {isNew ? 'Nuova Attivita' : 'Dettagli Attivita'}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Titolo *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Titolo attivita..."
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-blue-500/50 focus:outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Descrizione</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descrizione opzionale..."
              rows={3}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-700 focus:border-blue-500/50 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Data</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Stato</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500/50 focus:outline-none"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Priorita</label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:border-blue-500/50 focus:outline-none"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={!title.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all"
            >
              {isNew ? 'Crea Attivita' : 'Salva Modifiche'}
            </button>
            {!isNew && onDelete && (
              <button
                onClick={() => { onDelete(); onClose(); }}
                className="p-3.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-xl transition-all"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Task column section
const TaskSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  tasks: Task[];
  emptyMessage?: string;
  onQuickAdd: (title: string) => void;
  onToggleTask: (task: Task) => void;
  onClickTask: (task: Task) => void;
  accentColor?: string;
}> = ({ title, icon, tasks, emptyMessage = 'Nessuna attivita', onQuickAdd, onToggleTask, onClickTask, accentColor = 'text-blue-500' }) => {
  return (
    <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className={accentColor}>{icon}</span>
        <h3 className="text-[11px] font-black text-white uppercase tracking-widest">{title}</h3>
        {tasks.length > 0 && (
          <span className="ml-auto text-[10px] font-bold text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-lg">{tasks.length}</span>
        )}
      </div>

      <div className="space-y-1.5 max-h-[280px] overflow-y-auto custom-scrollbar">
        {tasks.length === 0 ? (
          <p className="text-[10px] text-zinc-700 py-4 text-center italic">{emptyMessage}</p>
        ) : (
          tasks.map(task => (
            <TaskItem key={task.id} task={task} onToggle={() => onToggleTask(task)} onClick={() => onClickTask(task)} />
          ))
        )}
      </div>

      <QuickAdd onAdd={onQuickAdd} />
    </div>
  );
};

// Calendar event type for unified display
interface CalendarEvent {
  id: string;
  title: string;
  type: 'task' | 'campaign' | 'appointment';
  date: string;
  color: string;
  priority?: string;
  status?: string;
  campaignType?: string;
  appointmentType?: string;
  description?: string;
  isStart?: boolean;
  isEnd?: boolean;
  isOngoing?: boolean;
}

// Main Dashboard component
interface DashboardProps {
  appointments: any[];
  talents: any[];
  collaborations: any[];
}

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

  // Calendar filter state
  const [calendarFilters, setCalendarFilters] = useState({
    status: 'ALL',
    priority: 'ALL',
    eventType: 'ALL' // 'ALL' | 'task' | 'campaign' | 'appointment'
  });

  // Sync note text when homeNote updates
  React.useEffect(() => {
    if (homeNote?.note_text && !noteEditing) {
      setNoteText(homeNote.note_text);
    }
  }, [homeNote?.note_text]);

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const tomorrow = useMemo(() => format(addDays(new Date(), 1), 'yyyy-MM-dd'), []);
  const dayAfterTomorrow = useMemo(() => format(addDays(new Date(), 2), 'yyyy-MM-dd'), []);
  const nextWeekEnd = useMemo(() => format(addDays(new Date(), 7), 'yyyy-MM-dd'), []);

  // Filter tasks for each column
  const activeTasks = useMemo(() => tasks.filter(t => t.status !== 'done'), [tasks]);

  const todayTasks = useMemo(() =>
    activeTasks.filter(t => t.due_date === today),
    [activeTasks, today]
  );

  const tomorrowTasks = useMemo(() =>
    activeTasks.filter(t => t.due_date === tomorrow),
    [activeTasks, tomorrow]
  );

  const dayAfterTomorrowTasks = useMemo(() =>
    activeTasks.filter(t => t.due_date === dayAfterTomorrow),
    [activeTasks, dayAfterTomorrow]
  );

  const urgentTasks = useMemo(() =>
    activeTasks.filter(t => t.priority === 'urgent' || (t.due_date && t.due_date < today)),
    [activeTasks, today]
  );

  const nextWeekTasks = useMemo(() =>
    activeTasks.filter(t => t.due_date && t.due_date >= today && t.due_date <= nextWeekEnd),
    [activeTasks, today, nextWeekEnd]
  );

  // Campaign events for day columns
  const getCampaignEventsForDay = useCallback((dayStr: string) => {
    const events: { id: string; label: string; campaignName: string; talentName: string; type: 'start' | 'end' | 'deadline'; isUrgent: boolean }[] = [];
    campaigns.forEach(c => {
      if (c.status !== 'Attiva' && c.status !== 'Chiusa') return;
      if (c.data_inizio && c.data_inizio.startsWith(dayStr)) {
        events.push({ id: `cs-${c.id}`, label: 'Inizio', campaignName: c.name, talentName: '', type: 'start', isUrgent: false });
      }
      if (c.data_fine && c.data_fine.startsWith(dayStr)) {
        events.push({ id: `ce-${c.id}`, label: 'Fine', campaignName: c.name, talentName: '', type: 'end', isUrgent: false });
      }
      if (c.deadline && c.deadline.startsWith(dayStr)) {
        events.push({ id: `cd-${c.id}`, label: 'Deadline', campaignName: c.name, talentName: '', type: 'deadline', isUrgent: true });
      }
    });
    // Also show campaign-talent deadlines
    campaignTalents.forEach(ct => {
      if (ct.deadline && ct.deadline.startsWith(dayStr)) {
        const campaign = campaigns.find(c => c.id === ct.campaign_id);
        const talent = talents.find(t => t.id === ct.talent_id);
        if (campaign) {
          events.push({
            id: `ctd-${ct.id}`,
            label: `Deadline ${talent ? talent.firstName : 'Talent'}`,
            campaignName: campaign.name,
            talentName: talent ? `${talent.firstName} ${talent.lastName}` : '',
            type: 'deadline',
            isUrgent: true
          });
        }
      }
    });
    return events;
  }, [campaigns, campaignTalents, talents]);

  // Urgent campaigns: deadline tomorrow or past-due
  const urgentCampaigns = useMemo(() => {
    const tomorrowDate = addDays(new Date(), 1);
    return campaigns.filter(c => {
      if (c.status !== 'Attiva') return false;
      if (!c.deadline) return false;
      const dl = parseISO(c.deadline);
      return isBefore(dl, addDays(new Date(), 2));
    });
  }, [campaigns]);

  // Calendar events: combine tasks, campaigns, and appointments
  const calendarEvents = useMemo(() => {
    const events: CalendarEvent[] = [];

    // Tasks
    if (calendarFilters.eventType === 'ALL' || calendarFilters.eventType === 'task') {
      tasks.forEach(t => {
        if (calendarFilters.status !== 'ALL' && t.status !== calendarFilters.status) return;
        if (calendarFilters.priority !== 'ALL' && t.priority !== calendarFilters.priority) return;
        if (!t.due_date) return;
        events.push({
          id: `task-${t.id}`,
          title: t.title,
          type: 'task',
          date: t.due_date,
          color: t.priority === 'urgent' ? 'bg-red-400' : t.priority === 'high' ? 'bg-amber-400' : t.status === 'done' ? 'bg-emerald-500' : 'bg-blue-400',
          priority: t.priority,
          status: t.status,
          description: t.description,
        });
      });
    }

    // Campaigns (show start and end dates + ongoing range)
    if (calendarFilters.eventType === 'ALL' || calendarFilters.eventType === 'campaign') {
      campaigns.forEach(c => {
        if (c.data_inizio) {
          events.push({
            id: `camp-start-${c.id}`,
            title: `${c.name}`,
            type: 'campaign',
            date: c.data_inizio,
            color: 'bg-purple-500',
            campaignType: c.tipo,
            status: c.status,
            isStart: true,
            description: `Inizio campagna${c.brand ? ` - ${c.brand}` : ''}`,
          });
        }
        if (c.data_fine) {
          events.push({
            id: `camp-end-${c.id}`,
            title: `${c.name}`,
            type: 'campaign',
            date: c.data_fine,
            color: 'bg-purple-500',
            campaignType: c.tipo,
            status: c.status,
            isEnd: true,
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
            campaignType: c.tipo,
            status: c.status,
            description: `Deadline campagna${c.brand ? ` - ${c.brand}` : ''}`,
          });
        }
      });
    }

    // Appointments
    if (calendarFilters.eventType === 'ALL' || calendarFilters.eventType === 'appointment') {
      appointments.forEach(a => {
        if (!a.date) return;
        events.push({
          id: `app-${a.id}`,
          title: `${a.type}: ${a.brand || a.talentName}`,
          type: 'appointment',
          date: a.date,
          color: 'bg-amber-400',
          appointmentType: a.type,
          status: a.status,
          description: a.description || `${a.type}${a.location ? ` @ ${a.location}` : ''}`,
        });
        if (a.deadline) {
          events.push({
            id: `app-deadline-${a.id}`,
            title: `Deadline: ${a.brand || a.talentName}`,
            type: 'appointment',
            date: a.deadline,
            color: 'bg-red-400',
            appointmentType: a.type,
            description: `Scadenza ${a.type}`,
          });
        }
      });
    }

    return events;
  }, [tasks, campaigns, appointments, calendarFilters]);

  // Get events for a specific day
  const getEventsForDay = useCallback((dateStr: string) => {
    return calendarEvents.filter(e => e.date === dateStr);
  }, [calendarEvents]);

  // Calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const handleQuickAdd = useCallback(async (title: string, dueDate: string, priority: TaskPriority = TaskPriority.LOW) => {
    await addTask({
      title,
      due_date: dueDate,
      status: TaskStatus.TODO,
      priority
    } as any);
  }, [addTask]);

  const handleToggleTask = useCallback(async (task: Task) => {
    const newStatus = task.status === 'done' ? TaskStatus.TODO : TaskStatus.DONE;
    await updateTask(task.id, { status: newStatus });
  }, [updateTask]);

  const handleSaveTask = useCallback(async (data: Partial<Task>) => {
    if (selectedTask) {
      await updateTask(selectedTask.id, data);
    } else {
      await addTask(data as any);
    }
  }, [selectedTask, updateTask, addTask]);

  const handleDeleteTask = useCallback(async () => {
    if (selectedTask) {
      await deleteTask(selectedTask.id);
      setSelectedTask(null);
    }
  }, [selectedTask, deleteTask]);

  const handleSaveNote = useCallback(async () => {
    await updateHomeNote(noteText);
    setNoteEditing(false);
  }, [noteText, updateHomeNote]);

  const handleCalendarDayClick = useCallback((day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEvents = getEventsForDay(dateStr);
    if (dayEvents.length > 0) {
      setSelectedCalendarDay(day);
    } else {
      setNewTaskDefaults({ date: dateStr });
      setShowNewTaskModal(true);
    }
  }, [getEventsForDay]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tighter">Home</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: it })}
          </p>
        </div>
        <button
          onClick={() => { setNewTaskDefaults({}); setShowNewTaskModal(true); }}
          className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={14} />
          Nuova Attivita
        </button>
      </div>

      {/* Layout: expands when calendar is expanded */}
      <div className={`grid grid-cols-1 gap-6 ${calendarExpanded ? '' : 'lg:grid-cols-[1fr_420px]'}`}>

        {/* LEFT: 4 task sections (hidden when calendar is expanded) */}
        {!calendarExpanded && (
          <div className="space-y-4">
            {/* OGGI */}
            <TaskSection
              title="Oggi"
              icon={<CalendarIcon size={16} />}
              tasks={todayTasks}
              emptyMessage="Nessuna attivita per oggi"
              onQuickAdd={(title) => handleQuickAdd(title, today)}
              onToggleTask={handleToggleTask}
              onClickTask={(t) => setSelectedTask(t)}
              accentColor="text-blue-500"
            />
            {getCampaignEventsForDay(today).length > 0 && (
              <div className="bg-[#0c0c0c] border border-purple-500/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={14} className="text-purple-400" />
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Campagne Oggi</span>
                  <span className="ml-auto text-[10px] font-bold text-zinc-600 bg-purple-500/10 px-2 py-0.5 rounded-lg">{getCampaignEventsForDay(today).length}</span>
                </div>
                <div className="space-y-1.5">
                  {getCampaignEventsForDay(today).map(evt => (
                    <div key={evt.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-purple-500/10 bg-purple-500/[0.03] hover:bg-purple-500/[0.06] transition-all">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${evt.type === 'deadline' ? 'bg-red-400' : 'bg-purple-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{evt.campaignName}</p>
                        <p className="text-[10px] text-purple-400/70 truncate">{evt.label}{evt.talentName ? ` — ${evt.talentName}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DOMANI */}
            <TaskSection
              title="Domani"
              icon={<Clock size={16} />}
              tasks={tomorrowTasks}
              emptyMessage="Nessuna attivita per domani"
              onQuickAdd={(title) => handleQuickAdd(title, tomorrow)}
              onToggleTask={handleToggleTask}
              onClickTask={(t) => setSelectedTask(t)}
              accentColor="text-emerald-500"
            />
            {getCampaignEventsForDay(tomorrow).length > 0 && (
              <div className="bg-[#0c0c0c] border border-purple-500/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={14} className="text-purple-400" />
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Campagne Domani</span>
                  <span className="ml-auto text-[10px] font-bold text-zinc-600 bg-purple-500/10 px-2 py-0.5 rounded-lg">{getCampaignEventsForDay(tomorrow).length}</span>
                </div>
                <div className="space-y-1.5">
                  {getCampaignEventsForDay(tomorrow).map(evt => (
                    <div key={evt.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-purple-500/10 bg-purple-500/[0.03] hover:bg-purple-500/[0.06] transition-all">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${evt.type === 'deadline' ? 'bg-red-400' : 'bg-purple-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{evt.campaignName}</p>
                        <p className="text-[10px] text-purple-400/70 truncate">{evt.label}{evt.talentName ? ` — ${evt.talentName}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DOPODOMANI */}
            <TaskSection
              title="Dopodomani"
              icon={<Clock size={16} />}
              tasks={dayAfterTomorrowTasks}
              emptyMessage="Nessuna attivita per dopodomani"
              onQuickAdd={(title) => handleQuickAdd(title, dayAfterTomorrow)}
              onToggleTask={handleToggleTask}
              onClickTask={(t) => setSelectedTask(t)}
              accentColor="text-purple-500"
            />
            {getCampaignEventsForDay(dayAfterTomorrow).length > 0 && (
              <div className="bg-[#0c0c0c] border border-purple-500/10 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={14} className="text-purple-400" />
                  <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Campagne Dopodomani</span>
                  <span className="ml-auto text-[10px] font-bold text-zinc-600 bg-purple-500/10 px-2 py-0.5 rounded-lg">{getCampaignEventsForDay(dayAfterTomorrow).length}</span>
                </div>
                <div className="space-y-1.5">
                  {getCampaignEventsForDay(dayAfterTomorrow).map(evt => (
                    <div key={evt.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-purple-500/10 bg-purple-500/[0.03] hover:bg-purple-500/[0.06] transition-all">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${evt.type === 'deadline' ? 'bg-red-400' : 'bg-purple-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{evt.campaignName}</p>
                        <p className="text-[10px] text-purple-400/70 truncate">{evt.label}{evt.talentName ? ` — ${evt.talentName}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* URGENZE & PROSSIMA SETTIMANA */}
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-400" />
                <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Urgenze & Prossima Settimana</h3>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1 mb-3 bg-zinc-900/50 p-1 rounded-xl">
                <button
                  onClick={() => setUrgentSubTab('urgent')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    urgentSubTab === 'urgent' ? 'bg-red-500/20 text-red-400' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  Urgenti / Scadute ({urgentTasks.length + urgentCampaigns.length})
                </button>
                <button
                  onClick={() => setUrgentSubTab('week')}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                    urgentSubTab === 'week' ? 'bg-blue-500/20 text-blue-400' : 'text-zinc-600 hover:text-zinc-400'
                  }`}
                >
                  Prossimi 7 Giorni ({nextWeekTasks.length})
                </button>
              </div>

              <div className="space-y-1.5 max-h-[220px] overflow-y-auto custom-scrollbar">
                {urgentSubTab === 'urgent' ? (
                  urgentTasks.length === 0 && urgentCampaigns.length === 0 ? (
                    <p className="text-[10px] text-zinc-700 py-4 text-center italic">Nessuna urgenza</p>
                  ) : (
                    <>
                      {urgentTasks.map(task => (
                        <TaskItem key={task.id} task={task} onToggle={() => handleToggleTask(task)} onClick={() => setSelectedTask(task)} />
                      ))}
                      {urgentCampaigns.map(c => (
                        <div key={`uc-${c.id}`} className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/[0.03] transition-all">
                          <div className="w-5 h-5 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                            <Briefcase size={12} className="text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-white truncate">{c.name}</p>
                            <p className="text-[10px] text-red-400/70 truncate">
                              Deadline: {c.deadline ? format(parseISO(c.deadline), 'd MMM', { locale: it }) : 'N/D'}
                            </p>
                          </div>
                          <span className="text-[8px] font-black text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded uppercase tracking-wider">Campagna</span>
                        </div>
                      ))}
                    </>
                  )
                ) : (
                  nextWeekTasks.length === 0 ? (
                    <p className="text-[10px] text-zinc-700 py-4 text-center italic">Nessuna attivita nei prossimi 7 giorni</p>
                  ) : (
                    nextWeekTasks.map(task => (
                      <TaskItem key={task.id} task={task} onToggle={() => handleToggleTask(task)} onClick={() => setSelectedTask(task)} />
                    ))
                  )
                )}
              </div>

              <QuickAdd onAdd={(title) => handleQuickAdd(title, today, TaskPriority.URGENT)} />

              {/* NOTE FISSATE */}
              <div className="mt-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote size={14} className="text-amber-400" />
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Note Fissate</span>
                  </div>
                  {!noteEditing ? (
                    <button onClick={() => setNoteEditing(true)} className="p-1.5 hover:bg-zinc-900 rounded-lg transition-all">
                      <Pencil size={12} className="text-zinc-600" />
                    </button>
                  ) : (
                    <button onClick={handleSaveNote} className="text-[10px] font-black text-blue-500 hover:text-blue-400 uppercase tracking-widest">
                      Salva
                    </button>
                  )}
                </div>
                {noteEditing ? (
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Scrivi le tue note qui..."
                    rows={4}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-700 focus:border-amber-500/50 focus:outline-none resize-none"
                    autoFocus
                  />
                ) : (
                  <div
                    onClick={() => setNoteEditing(true)}
                    className="min-h-[60px] bg-zinc-900/30 rounded-xl px-3 py-2 text-xs text-zinc-400 cursor-pointer hover:bg-zinc-900/50 transition-all whitespace-pre-wrap"
                  >
                    {noteText || <span className="italic text-zinc-700">Clicca per aggiungere note...</span>}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* RIGHT: Calendar (expandable) */}
        <div className={`space-y-4 ${calendarExpanded ? 'col-span-full' : ''}`}>
          <div className={`bg-[#0c0c0c] border border-white/5 rounded-2xl p-4 ${calendarExpanded ? '' : 'md:sticky md:top-28'}`}>
            {/* Calendar header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-black text-white uppercase tracking-widest">
                  {format(currentMonth, 'MMMM yyyy', { locale: it })}
                </span>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                onClick={() => setCalendarExpanded(!calendarExpanded)}
                className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all"
                title={calendarExpanded ? 'Comprimi calendario' : 'Espandi calendario'}
              >
                {calendarExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
            </div>

            {/* Filters row */}
            <div className="flex gap-2 mb-3 flex-wrap">
              <select
                value={calendarFilters.eventType}
                onChange={e => setCalendarFilters(p => ({ ...p, eventType: e.target.value }))}
                className="flex-1 min-w-[120px] bg-zinc-900/50 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase focus:outline-none"
              >
                <option value="ALL">Tutto</option>
                <option value="task">Solo Attivita</option>
                <option value="campaign">Solo Campagne</option>
                <option value="appointment">Solo Appuntamenti</option>
              </select>
              <select
                value={calendarFilters.status}
                onChange={e => setCalendarFilters(p => ({ ...p, status: e.target.value }))}
                className="flex-1 min-w-[120px] bg-zinc-900/50 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase focus:outline-none"
              >
                <option value="ALL">Tutti gli stati</option>
                <option value="todo">Da fare</option>
                <option value="in_progress">In corso</option>
                <option value="done">Completate</option>
              </select>
              <select
                value={calendarFilters.priority}
                onChange={e => setCalendarFilters(p => ({ ...p, priority: e.target.value }))}
                className="flex-1 min-w-[120px] bg-zinc-900/50 border border-white/5 rounded-lg px-2 py-1.5 text-[10px] font-bold text-zinc-400 uppercase focus:outline-none"
              >
                <option value="ALL">Tutte le priorita</option>
                <option value="low">Bassa</option>
                <option value="normal">Normale</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>

            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {['Lu', 'Ma', 'Me', 'Gi', 'Ve', 'Sa', 'Do'].map(d => (
                <div key={d} className="text-center text-[9px] font-black text-zinc-600 uppercase tracking-widest py-2">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = getEventsForDay(dateStr);
                const isToday = isDateToday(day);
                const inMonth = isSameMonth(day, currentMonth);

                // Check if any campaign is ongoing through this day
                const ongoingCampaigns = (calendarFilters.eventType === 'ALL' || calendarFilters.eventType === 'campaign')
                  ? campaigns.filter(c => {
                      if (!c.data_inizio || !c.data_fine) return false;
                      try {
                        return isWithinInterval(day, { start: parseISO(c.data_inizio), end: parseISO(c.data_fine) });
                      } catch { return false; }
                    })
                  : [];

                const hasOngoing = ongoingCampaigns.length > 0 && inMonth;

                return (
                  <div
                    key={idx}
                    onClick={() => handleCalendarDayClick(day)}
                    className={`relative cursor-pointer rounded-lg transition-all hover:bg-zinc-900/50 ${
                      !inMonth ? 'opacity-20' : ''
                    } ${hasOngoing ? 'bg-purple-500/[0.04]' : ''} ${
                      calendarExpanded ? 'min-h-[100px] p-2 border-r border-b border-white/5' : 'p-1.5 text-center'
                    }`}
                  >
                    <div className={calendarExpanded ? 'flex justify-between items-center mb-1' : ''}>
                      <span className={`text-[11px] font-black flex items-center justify-center rounded-lg ${
                        calendarExpanded ? 'w-7 h-7' : 'w-7 h-7 mx-auto'
                      } ${
                        isToday ? 'bg-blue-600 text-white' : 'text-zinc-400'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {calendarExpanded && dayEvents.length > 0 && inMonth && (
                        <span className="text-[8px] text-zinc-600 font-bold">{dayEvents.length}</span>
                      )}
                    </div>

                    {/* Expanded view: show event labels */}
                    {calendarExpanded && inMonth && (
                      <div className="space-y-1 mt-1">
                        {dayEvents.slice(0, 4).map((evt, i) => (
                          <div
                            key={i}
                            className={`px-1.5 py-1 rounded text-[8px] font-bold truncate border-l-2 ${
                              evt.type === 'campaign' ? 'bg-purple-500/10 border-purple-500 text-purple-400' :
                              evt.type === 'appointment' ? 'bg-amber-500/10 border-amber-500 text-amber-400' :
                              evt.priority === 'urgent' ? 'bg-red-500/10 border-red-500 text-red-400' :
                              'bg-blue-500/10 border-blue-500 text-blue-400'
                            }`}
                          >
                            {evt.type === 'campaign' && (evt.isStart ? 'Inizio: ' : evt.isEnd ? 'Fine: ' : '')}
                            {evt.title}
                          </div>
                        ))}
                        {dayEvents.length > 4 && (
                          <p className="text-[7px] text-zinc-600 font-bold text-center">+{dayEvents.length - 4} altri</p>
                        )}
                      </div>
                    )}

                    {/* Compact view: dots */}
                    {!calendarExpanded && dayEvents.length > 0 && inMonth && (
                      <div className="flex items-center justify-center gap-0.5 mt-1 min-h-[6px]">
                        {dayEvents.slice(0, 5).map((evt, i) => (
                          <div key={i} className={`w-1.5 h-1.5 rounded-full ${evt.color}`} />
                        ))}
                        {dayEvents.length > 5 && (
                          <span className="text-[7px] text-zinc-600 font-bold">+{dayEvents.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-blue-400" />
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Attivita</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Campagne</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Appuntamenti</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider">Urgenze/Deadline</span>
              </div>
            </div>

            {/* Today's events preview */}
            <div className="mt-4 pt-4 border-t border-white/5">
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-2">
                Oggi ({getEventsForDay(today).length} eventi)
              </p>
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                {getEventsForDay(today).length === 0 ? (
                  <p className="text-[10px] text-zinc-700 py-3 text-center italic">Nessun evento per oggi</p>
                ) : (
                  getEventsForDay(today).map(evt => (
                    <div
                      key={evt.id}
                      onClick={() => evt.type === 'task' ? setSelectedTask(tasks.find(t => `task-${t.id}` === evt.id) || null) : undefined}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all cursor-pointer hover:bg-white/[0.02] ${
                        evt.type === 'campaign' ? 'border-purple-500/20 bg-purple-500/[0.03]' :
                        evt.type === 'appointment' ? 'border-amber-500/20 bg-amber-500/[0.03]' :
                        'border-white/5'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${evt.color}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">{evt.title}</p>
                        {evt.description && <p className="text-[10px] text-zinc-600 truncate">{evt.description}</p>}
                      </div>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                        evt.type === 'campaign' ? 'bg-purple-500/10 text-purple-400' :
                        evt.type === 'appointment' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-blue-500/10 text-blue-400'
                      }`}>
                        {evt.type === 'campaign' ? 'Campagna' : evt.type === 'appointment' ? 'Appunt.' : 'Task'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Day Detail Modal */}
      <AnimatePresence>
        {selectedCalendarDay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCalendarDay(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-lg shadow-3xl overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-tight">
                      {format(selectedCalendarDay, 'd MMMM yyyy', { locale: it })}
                    </h3>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {format(selectedCalendarDay, 'EEEE', { locale: it })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNewTaskDefaults({ date: format(selectedCalendarDay, 'yyyy-MM-dd') });
                        setSelectedCalendarDay(null);
                        setShowNewTaskModal(true);
                      }}
                      className="p-2 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-all"
                      title="Aggiungi attivita"
                    >
                      <Plus size={16} />
                    </button>
                    <button onClick={() => setSelectedCalendarDay(null)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
                  {getEventsForDay(format(selectedCalendarDay, 'yyyy-MM-dd')).map(evt => (
                    <div
                      key={evt.id}
                      className={`p-4 rounded-2xl border ${
                        evt.type === 'campaign' ? 'bg-purple-500/5 border-purple-500/20' :
                        evt.type === 'appointment' ? 'bg-amber-500/5 border-amber-500/20' :
                        evt.priority === 'urgent' ? 'bg-red-500/5 border-red-500/20' :
                        'bg-zinc-900/50 border-white/5'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-lg tracking-wider ${
                              evt.type === 'campaign' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                              evt.type === 'appointment' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                              'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}>
                              {evt.type === 'campaign' ? (evt.isStart ? 'Inizio Campagna' : evt.isEnd ? 'Fine Campagna' : 'Deadline') :
                               evt.type === 'appointment' ? (evt.appointmentType || 'Appuntamento') :
                               'Attivita'}
                            </span>
                            {evt.priority && (
                              <Flag size={10} className={PRIORITY_COLORS[evt.priority] || 'text-zinc-600'} />
                            )}
                          </div>
                          <p className="text-sm font-black text-white">{evt.title}</p>
                          {evt.description && (
                            <p className="text-xs text-zinc-500 mt-1">{evt.description}</p>
                          )}
                        </div>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 mt-1 ${evt.color}`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onSave={handleSaveTask}
            onDelete={handleDeleteTask}
          />
        )}
      </AnimatePresence>

      {/* New Task Modal */}
      <AnimatePresence>
        {showNewTaskModal && (
          <TaskModal
            task={null}
            isNew
            defaultDate={newTaskDefaults.date}
            defaultPriority={newTaskDefaults.priority}
            onClose={() => setShowNewTaskModal(false)}
            onSave={handleSaveTask}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Dashboard;
