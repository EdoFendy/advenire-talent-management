
import React, { useState, useMemo } from 'react';
import {
  Briefcase, Plus, Calendar,
  Users, X, Trash2, ChevronRight, ChevronLeft,
  CheckCircle2, Music, Megaphone, Building2, UserPlus,
  Eye, Edit3, Lock, ListTodo, ArrowRight, Zap, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CampaignStatus, CampaignTalentStatus, TaskStatus, TaskPriority } from '../types';
import { useApp } from '../context/AppContext';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SearchInput } from '@/components/ui/search-input';
import { staggerContainer, staggerItem } from '@/lib/animations';

// ==================== WIZARD COMPONENT ====================

interface WizardProps {
  onClose: () => void;
  preselectedClientId?: string;
}

const CampaignWizard: React.FC<WizardProps> = ({ onClose, preselectedClientId }) => {
  const {
    clients, talents, addCampaign, addClient, addCampaignTalent, showToast
  } = useApp();

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Step 1: Tipo
  const [tipo, setTipo] = useState<'Suono' | 'Brand'>('Brand');

  // Step 2: Dati
  const [nome, setNome] = useState('');
  const [budget, setBudget] = useState(0);
  const [dataInizio, setDataInizio] = useState('');
  const [dataFine, setDataFine] = useState('');
  const [note, setNote] = useState('');

  // Step 3: Cliente
  const [clientId, setClientId] = useState(preselectedClientId || '');
  const [clientSearch, setClientSearch] = useState('');
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClient, setNewClient] = useState({ tipo: '', ragione_sociale: '', referente: '', email: '', telefono: '' });

  // Step 4: Talenti
  const [selectedTalentIds, setSelectedTalentIds] = useState<string[]>([]);
  const [talentSearch, setTalentSearch] = useState('');

  // Step 5: Compensi
  const [compensi, setCompensi] = useState<Record<string, number>>({});

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      c.ragione_sociale.toLowerCase().includes(q) ||
      (c.referente && c.referente.toLowerCase().includes(q))
    );
  }, [clients, clientSearch]);

  const filteredTalents = useMemo(() => {
    if (!talentSearch) return talents.filter(t => t.status === 'active');
    const q = talentSearch.toLowerCase();
    return talents.filter(t =>
      t.status === 'active' && (
        t.firstName.toLowerCase().includes(q) ||
        t.lastName.toLowerCase().includes(q) ||
        (t.stageName && t.stageName.toLowerCase().includes(q))
      )
    );
  }, [talents, talentSearch]);

  const totalCompensi = useMemo(() =>
    selectedTalentIds.reduce((sum, id) => sum + (compensi[id] || 0), 0),
    [selectedTalentIds, compensi]
  );

  const budgetResiduo = budget - totalCompensi;

  const toggleTalent = (id: string) => {
    setSelectedTalentIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const canNext = () => {
    switch (step) {
      case 1: return true;
      case 2: return nome.trim() !== '' && budget > 0;
      case 3: return clientId !== '' || showNewClient;
      case 4: return true;
      case 5: return true;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      let finalClientId = clientId;

      if (showNewClient && newClient.ragione_sociale) {
        const created = await addClient(newClient as any);
        finalClientId = created.id;
      }

      const campaignData = {
        name: nome,
        tipo,
        client_id: finalClientId || undefined,
        totalBudget: budget,
        agencyFeePercent: 30,
        status: CampaignStatus.DRAFT,
        data_inizio: dataInizio || undefined,
        data_fine: dataFine || undefined,
        notes: note || undefined,
        brand: finalClientId ? clients.find(c => c.id === finalClientId)?.ragione_sociale || '' : ''
      };

      const campaign = await addCampaign(campaignData);

      for (const talentId of selectedTalentIds) {
        await addCampaignTalent({
          campaign_id: campaign.id,
          talent_id: talentId,
          compenso_lordo: compensi[talentId] || 0,
          stato: CampaignTalentStatus.INVITED
        });
      }

      showToast(`Campagna "${nome}" creata con successo`, 'success');
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Errore durante la creazione', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepLabels = ['Tipo', 'Dati', 'Cliente', 'Talenti', 'Compensi'];

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              Nuova Campagna
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
              Passo {step} di 5 — {stepLabels[step - 1]}
            </p>
          </DialogHeader>
        </div>

        {/* Step Indicators */}
        <div className="px-6 pt-4 flex gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${i + 1 <= step ? 'bg-primary' : 'bg-white/[0.06]'}`} />
              <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${i + 1 <= step ? 'text-primary' : 'text-muted-foreground/50'}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Step 1: Tipo */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground font-bold">Seleziona il tipo di campagna</p>
              <div className="grid grid-cols-2 gap-4">
                <GlassCard
                  variant={tipo === 'Suono' ? 'prominent' : 'interactive'}
                  hover
                  onClick={() => setTipo('Suono')}
                  className={`p-6 flex flex-col items-center gap-3 cursor-pointer ${
                    tipo === 'Suono' ? 'border-primary bg-primary/10' : ''
                  }`}
                >
                  <Music size={32} className={tipo === 'Suono' ? 'text-primary' : 'text-muted-foreground'} />
                  <span className="text-sm font-black uppercase tracking-widest text-foreground">Suono</span>
                  <span className="text-[10px] text-muted-foreground">Campagna musicale</span>
                </GlassCard>
                <GlassCard
                  variant={tipo === 'Brand' ? 'prominent' : 'interactive'}
                  hover
                  onClick={() => setTipo('Brand')}
                  className={`p-6 flex flex-col items-center gap-3 cursor-pointer ${
                    tipo === 'Brand' ? 'border-primary bg-primary/10' : ''
                  }`}
                >
                  <Megaphone size={32} className={tipo === 'Brand' ? 'text-primary' : 'text-muted-foreground'} />
                  <span className="text-sm font-black uppercase tracking-widest text-foreground">Brand</span>
                  <span className="text-[10px] text-muted-foreground">Campagna brand / ADV</span>
                </GlassCard>
              </div>
            </div>
          )}

          {/* Step 2: Dati */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="block mb-2">Nome Campagna *</Label>
                <Input
                  type="text"
                  required
                  placeholder="es. Lancio Estate 2026"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              </div>
              <div>
                <Label className="block mb-2">Budget Totale (&euro;) *</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={budget || ''}
                  onChange={e => setBudget(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="block mb-2">Data Inizio</Label>
                  <Input
                    type="date"
                    value={dataInizio}
                    onChange={e => setDataInizio(e.target.value)}
                  />
                </div>
                <div>
                  <Label className="block mb-2">Data Fine</Label>
                  <Input
                    type="date"
                    value={dataFine}
                    onChange={e => setDataFine(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label className="block mb-2">Note</Label>
                <Textarea
                  rows={3}
                  placeholder="Note aggiuntive..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Cliente */}
          {step === 3 && (
            <div className="space-y-4">
              {!showNewClient ? (
                <>
                  <SearchInput
                    value={clientSearch}
                    onChange={setClientSearch}
                    placeholder="Cerca cliente..."
                  />
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredClients.map(c => (
                      <GlassCard
                        key={c.id}
                        variant="interactive"
                        hover
                        onClick={() => setClientId(c.id)}
                        className={`p-3 flex items-center gap-3 cursor-pointer ${
                          clientId === c.id ? 'border-primary bg-primary/10' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center">
                          <Building2 size={14} className="text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-foreground truncate">{c.ragione_sociale}</p>
                          {c.referente && <p className="text-[10px] text-muted-foreground truncate">{c.referente}</p>}
                        </div>
                        {clientId === c.id && <CheckCircle2 size={16} className="text-primary" />}
                      </GlassCard>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="text-center text-muted-foreground text-xs py-4">Nessun cliente trovato</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-dashed"
                    onClick={() => { setShowNewClient(true); setClientId(''); }}
                  >
                    <Plus size={14} /> Crea Nuovo Cliente
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-black text-primary uppercase tracking-widest">Nuovo Cliente</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowNewClient(false)}>
                      Scegli esistente
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="block mb-2">Tipo</Label>
                      <Input
                        type="text"
                        placeholder="es. Agenzia, Brand..."
                        value={newClient.tipo}
                        onChange={e => setNewClient({ ...newClient, tipo: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="block mb-2">Ragione Sociale *</Label>
                      <Input
                        type="text"
                        required
                        value={newClient.ragione_sociale}
                        onChange={e => setNewClient({ ...newClient, ragione_sociale: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="block mb-2">Referente</Label>
                    <Input
                      type="text"
                      value={newClient.referente}
                      onChange={e => setNewClient({ ...newClient, referente: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="block mb-2">Email</Label>
                      <Input
                        type="email"
                        value={newClient.email}
                        onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="block mb-2">Telefono</Label>
                      <Input
                        type="tel"
                        value={newClient.telefono}
                        onChange={e => setNewClient({ ...newClient, telefono: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Talenti */}
          {step === 4 && (
            <div className="space-y-4">
              <SearchInput
                value={talentSearch}
                onChange={setTalentSearch}
                placeholder="Cerca talent..."
              />

              {selectedTalentIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTalentIds.map(id => {
                    const t = talents.find(x => x.id === id);
                    if (!t) return null;
                    return (
                      <Badge key={id} variant="default" className="gap-1.5 pl-3 pr-1.5 py-1.5">
                        {t.firstName} {t.lastName}
                        <button onClick={() => toggleTalent(id)} className="hover:text-foreground ml-1"><X size={12} /></button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {filteredTalents.map(t => {
                  const selected = selectedTalentIds.includes(t.id);
                  return (
                    <GlassCard
                      key={t.id}
                      variant="interactive"
                      hover
                      onClick={() => toggleTalent(t.id)}
                      className={`p-3 flex items-center gap-3 cursor-pointer ${
                        selected ? 'border-primary bg-primary/10' : ''
                      }`}
                    >
                      <Avatar className="h-10 w-10">
                        {t.photoUrl ? (
                          <AvatarImage src={t.photoUrl} alt={`${t.firstName} ${t.lastName}`} />
                        ) : null}
                        <AvatarFallback>
                          {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-foreground truncate">{t.firstName} {t.lastName}</p>
                        {t.stageName && <p className="text-[10px] text-muted-foreground truncate">{t.stageName}</p>}
                      </div>
                      {selected && <CheckCircle2 size={16} className="text-primary" />}
                    </GlassCard>
                  );
                })}
              </div>

              <p className="text-[10px] text-muted-foreground font-bold text-center">
                {selectedTalentIds.length} talent selezionat{selectedTalentIds.length === 1 ? 'o' : 'i'}
              </p>
            </div>
          )}

          {/* Step 5: Compensi */}
          {step === 5 && (
            <div className="space-y-4">
              {selectedTalentIds.length === 0 ? (
                <p className="text-center text-muted-foreground text-xs py-8">Nessun talent selezionato</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {selectedTalentIds.map(id => {
                      const t = talents.find(x => x.id === id);
                      if (!t) return null;
                      return (
                        <GlassCard key={id} className="p-3 flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            {t.photoUrl ? (
                              <AvatarImage src={t.photoUrl} alt={`${t.firstName} ${t.lastName}`} />
                            ) : null}
                            <AvatarFallback>
                              {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-foreground truncate">{t.firstName} {t.lastName}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground text-sm font-bold">&euro;</span>
                            <Input
                              type="number"
                              min={0}
                              className="w-28 text-right"
                              placeholder="0"
                              value={compensi[id] || ''}
                              onChange={e => setCompensi(prev => ({ ...prev, [id]: Number(e.target.value) }))}
                            />
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>

                  <GlassCard variant="prominent" className="p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Budget Totale</span>
                      <span className="text-sm font-black text-foreground">&euro;{budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Totale Compensi</span>
                      <span className="text-sm font-black text-primary">&euro;{totalCompensi.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Budget Residuo</span>
                      <span className={`text-sm font-black ${budgetResiduo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        &euro;{budgetResiduo.toLocaleString()}
                      </span>
                    </div>
                  </GlassCard>

                  {budgetResiduo < 0 && (
                    <GlassCard className="bg-red-500/10 border-red-500/20 p-3 text-center">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                        Attenzione: il totale dei compensi supera il budget di &euro;{Math.abs(budgetResiduo).toLocaleString()}
                      </p>
                    </GlassCard>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/[0.06] flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="gap-2 text-[10px] font-black uppercase tracking-widest"
          >
            <ChevronLeft size={14} />
            {step > 1 ? 'Indietro' : 'Annulla'}
          </Button>

          {step < 5 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="gap-2 text-[10px] font-black uppercase tracking-widest"
            >
              Avanti <ChevronRight size={14} />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? 'Creazione...' : 'Crea Campagna'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ==================== DETAIL COMPONENT ====================

interface CampaignDetailProps {
  campaignId: string;
  onClose: () => void;
}

const CampaignDetail: React.FC<CampaignDetailProps> = ({ campaignId, onClose }) => {
  const {
    campaigns, clients, talents, campaignTalents, tasks, income,
    updateCampaign, activateCampaign, addCampaignTalent, updateCampaignTalent, deleteCampaignTalent,
    addTask, updateTask, deleteTask,
    addIncome, updateIncome, deleteIncome,
    showToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<'panoramica' | 'talenti' | 'cliente' | 'attivita'>('panoramica');
  const [showAddTalent, setShowAddTalent] = useState(false);
  const [addTalentSearch, setAddTalentSearch] = useState('');
  const [addTalentId, setAddTalentId] = useState('');
  const [addTalentCompenso, setAddTalentCompenso] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ name: '', notes: '', data_inizio: '', data_fine: '' });
  const [showNewTask, setShowNewTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [newIncomeData, setNewIncomeData] = useState({ amount: 0, note: '', date: format(new Date(), 'yyyy-MM-dd') });

  const campaign = campaigns.find(c => c.id === campaignId);
  if (!campaign) return null;

  const client = campaign.client_id ? clients.find(c => c.id === campaign.client_id) : null;
  const cts = campaignTalents.filter(ct => ct.campaign_id === campaign.id);
  const relatedTasks = tasks.filter(t => t.related_type === 'campaign' && t.related_id === campaign.id);
  const campaignIncome = income.filter(i => i.campaignId === campaign.id);

  const totalCompensi = cts.reduce((sum, ct) => sum + ct.compenso_lordo, 0);
  const totalPaid = cts.filter(ct => ct.stato === CampaignTalentStatus.PAID).reduce((sum, ct) => sum + ct.compenso_lordo, 0);
  const totalIncomeReceived = campaignIncome.filter(i => i.status === 'received').reduce((sum, i) => sum + i.amount, 0);
  const isClosed = campaign.status === CampaignStatus.CLOSED;

  const handleStartEdit = () => {
    setEditData({
      name: campaign.name,
      notes: campaign.notes || '',
      data_inizio: campaign.data_inizio || '',
      data_fine: campaign.data_fine || ''
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    await updateCampaign(campaign.id, editData);
    setIsEditing(false);
  };

  const handleToggleStatus = async () => {
    if (campaign.status === CampaignStatus.DRAFT) {
      await activateCampaign(campaign.id);
    } else {
      const newStatus = campaign.status === CampaignStatus.ACTIVE ? CampaignStatus.CLOSED : CampaignStatus.ACTIVE;
      await updateCampaign(campaign.id, { status: newStatus });
    }
  };

  const handleAddTalentSubmit = async () => {
    if (!addTalentId) return;
    await addCampaignTalent({
      campaign_id: campaign.id,
      talent_id: addTalentId,
      compenso_lordo: addTalentCompenso,
      stato: CampaignTalentStatus.INVITED
    });
    setShowAddTalent(false);
    setAddTalentId('');
    setAddTalentCompenso(0);
    setAddTalentSearch('');
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    await addTask({
      title: newTaskTitle,
      status: TaskStatus.TODO,
      priority: TaskPriority.NORMAL,
      related_type: 'campaign',
      related_id: campaign.id,
      due_date: format(new Date(), 'yyyy-MM-dd')
    });
    setNewTaskTitle('');
    setShowNewTask(false);
  };

  const filteredAddTalents = useMemo(() => {
    const existingIds = cts.map(ct => ct.talent_id);
    let available = talents.filter(t => !existingIds.includes(t.id) && t.status === 'active');
    if (addTalentSearch) {
      const q = addTalentSearch.toLowerCase();
      available = available.filter(t =>
        t.firstName.toLowerCase().includes(q) ||
        t.lastName.toLowerCase().includes(q) ||
        (t.stageName && t.stageName.toLowerCase().includes(q))
      );
    }
    return available;
  }, [talents, cts, addTalentSearch]);

  const getStatusBadgeVariant = (status: string): "default" | "success" | "warning" | "secondary" | "destructive" => {
    switch (status) {
      case CampaignStatus.ACTIVE: return 'default';
      case CampaignStatus.CLOSED: return 'secondary';
      case CampaignStatus.DRAFT: return 'warning';
      default: return 'secondary';
    }
  };

  const getTipoBadgeVariant = (campaignTipo: string): "default" | "success" => {
    return campaignTipo === 'Suono' ? 'default' : 'success';
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-4xl h-full bg-white/[0.02] backdrop-blur-2xl border-l border-white/[0.1] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={getStatusBadgeVariant(campaign.status)}>
                  {campaign.status}
                </Badge>
                <Badge variant={getTipoBadgeVariant(campaign.tipo || 'Brand')} className={
                  campaign.tipo === 'Suono' ? 'bg-purple-500/15 text-purple-400 border-purple-500/20' : ''
                }>
                  {campaign.tipo || 'Brand'}
                </Badge>
              </div>
              <h2 className="text-2xl font-black text-foreground uppercase tracking-tight">{campaign.name}</h2>
              {client && <p className="text-xs text-muted-foreground font-bold mt-1">{client.ragione_sociale}</p>}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-muted-foreground font-bold">
                {campaign.data_inizio && (
                  <span className="flex items-center gap-1">
                    <Calendar size={12} /> {format(new Date(campaign.data_inizio), 'dd MMM yyyy', { locale: it })}
                  </span>
                )}
                {campaign.data_fine && (
                  <span className="flex items-center gap-1">
                    <ArrowRight size={10} /> {format(new Date(campaign.data_fine), 'dd MMM yyyy', { locale: it })}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleStartEdit} title="Modifica">
                <Edit3 size={16} />
              </Button>
              {campaign.status === CampaignStatus.DRAFT ? (
                <Button onClick={handleToggleStatus} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20" size="sm">
                  <Zap size={14} /> Attiva Campagna
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={handleToggleStatus} title={isClosed ? 'Riapri' : 'Chiudi'}>
                  {isClosed ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X size={18} />
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-3 pt-3 border-b border-white/[0.06]">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList className="w-full justify-start">
              <TabsTrigger value="panoramica" className="gap-1.5">
                <Eye size={14} />
                <span>Panoramica</span>
              </TabsTrigger>
              <TabsTrigger value="talenti" className="gap-1.5">
                <Users size={14} />
                <span>Talenti</span>
              </TabsTrigger>
              <TabsTrigger value="cliente" className="gap-1.5">
                <Building2 size={14} />
                <span>Cliente</span>
              </TabsTrigger>
              <TabsTrigger value="attivita" className="gap-1.5">
                <ListTodo size={14} />
                <span>Attivit&agrave;</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Panoramica */}
          {activeTab === 'panoramica' && (
            <div className="space-y-6">
              {isEditing ? (
                <GlassCard variant="prominent" className="p-6 space-y-4">
                  <div>
                    <Label className="block mb-2">Nome</Label>
                    <Input
                      type="text"
                      value={editData.name}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2">Data Inizio</Label>
                      <Input type="date" value={editData.data_inizio} onChange={e => setEditData({ ...editData, data_inizio: e.target.value })} />
                    </div>
                    <div>
                      <Label className="block mb-2">Data Fine</Label>
                      <Input type="date" value={editData.data_fine} onChange={e => setEditData({ ...editData, data_fine: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label className="block mb-2">Note</Label>
                    <Textarea rows={3} value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} className="flex-1 text-[10px] font-black uppercase tracking-widest">
                      Salva
                    </Button>
                    <Button variant="secondary" onClick={() => setIsEditing(false)} className="text-[10px] font-black uppercase tracking-widest">
                      Annulla
                    </Button>
                  </div>
                </GlassCard>
              ) : (
                <>
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="show"
                    className="grid grid-cols-3 gap-4"
                  >
                    <motion.div variants={staggerItem}>
                      <GlassCard className="p-5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Budget</p>
                        <p className="text-2xl font-black text-foreground">&euro;{campaign.totalBudget.toLocaleString()}</p>
                      </GlassCard>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                      <GlassCard className="p-5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Compensi Talent</p>
                        <p className="text-2xl font-black text-primary">&euro;{totalCompensi.toLocaleString()}</p>
                      </GlassCard>
                    </motion.div>
                    <motion.div variants={staggerItem}>
                      <GlassCard className="p-5">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Margine</p>
                        <p className={`text-2xl font-black ${(campaign.totalBudget - totalCompensi) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          &euro;{(campaign.totalBudget - totalCompensi).toLocaleString()}
                        </p>
                      </GlassCard>
                    </motion.div>
                  </motion.div>

                  <div className="grid grid-cols-2 gap-4">
                    <GlassCard className="p-5">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Incassato</p>
                      <p className="text-xl font-black text-emerald-400">&euro;{totalIncomeReceived.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground/60 font-bold mt-1">
                        su &euro;{campaignIncome.reduce((s, i) => s + i.amount, 0).toLocaleString()} pianificato
                      </p>
                    </GlassCard>
                    <GlassCard className="p-5">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Talent Pagati</p>
                      <p className="text-xl font-black text-foreground">{cts.filter(ct => ct.stato === CampaignTalentStatus.PAID).length} / {cts.length}</p>
                      <p className="text-[10px] text-muted-foreground/60 font-bold mt-1">
                        &euro;{totalPaid.toLocaleString()} su &euro;{totalCompensi.toLocaleString()}
                      </p>
                    </GlassCard>
                  </div>

                  {campaign.notes && (
                    <GlassCard className="p-5">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Note</p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{campaign.notes}</p>
                    </GlassCard>
                  )}

                  {/* Income Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Piano di Fatturazione</h4>
                    </div>
                    {campaignIncome.map(inc => (
                      <GlassCard key={inc.id} className="p-4 flex justify-between items-center group">
                        <div>
                          <p className="text-sm font-bold text-foreground">{inc.note || 'Fattura'}</p>
                          <p className="text-[10px] text-muted-foreground">{format(new Date(inc.date), 'dd MMM yyyy', { locale: it })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-black text-foreground">&euro;{inc.amount.toLocaleString()}</p>
                          <Badge
                            variant={inc.status === 'received' ? 'success' : 'warning'}
                            className="cursor-pointer"
                            onClick={() => updateIncome(inc.id, { status: inc.status === 'received' ? 'pending' : 'received' })}
                          >
                            {inc.status === 'received' ? 'Incassato' : 'In attesa'}
                          </Badge>
                          <button onClick={() => deleteIncome(inc.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </GlassCard>
                    ))}

                    {showIncomeForm ? (
                      <GlassCard variant="prominent" className="p-4 space-y-3 border-primary/30">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="block mb-1">Importo (&euro;)</Label>
                            <Input type="number" value={newIncomeData.amount || ''} onChange={e => setNewIncomeData({ ...newIncomeData, amount: Number(e.target.value) })} />
                          </div>
                          <div>
                            <Label className="block mb-1">Data</Label>
                            <Input type="date" value={newIncomeData.date} onChange={e => setNewIncomeData({ ...newIncomeData, date: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <Label className="block mb-1">Descrizione</Label>
                          <Input type="text" placeholder="es. Acconto 30%" value={newIncomeData.note} onChange={e => setNewIncomeData({ ...newIncomeData, note: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={async () => {
                              if (newIncomeData.amount <= 0) return;
                              await addIncome({ campaignId: campaign.id, ...newIncomeData, status: 'pending' });
                              setShowIncomeForm(false);
                              setNewIncomeData({ amount: 0, note: '', date: format(new Date(), 'yyyy-MM-dd') });
                            }}
                            className="flex-1 text-xs font-black uppercase tracking-widest"
                          >
                            Salva
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setShowIncomeForm(false)}>
                            <X size={16} />
                          </Button>
                        </div>
                      </GlassCard>
                    ) : (
                      <Button
                        variant="outline"
                        className="w-full border-dashed"
                        onClick={() => setShowIncomeForm(true)}
                      >
                        <Plus size={14} /> Aggiungi Fattura / Incasso
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Tab: Talenti */}
          {activeTab === 'talenti' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
                  Talenti Coinvolti ({cts.length})
                </h3>
                {!isClosed && (
                  <Button onClick={() => setShowAddTalent(true)} size="sm" className="gap-1.5 text-[10px] font-black uppercase tracking-widest">
                    <UserPlus size={14} /> Aggiungi
                  </Button>
                )}
              </div>

              {cts.map(ct => {
                const talent = talents.find(t => t.id === ct.talent_id);
                const statusOptions = Object.values(CampaignTalentStatus);
                return (
                  <GlassCard key={ct.id} className="p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-white/[0.06]">
                        {talent?.photoUrl ? (
                          <AvatarImage src={talent.photoUrl} alt={talent ? `${talent.firstName} ${talent.lastName}` : ''} />
                        ) : null}
                        <AvatarFallback>
                          {talent ? `${talent.firstName.charAt(0)}${talent.lastName.charAt(0)}` : '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-foreground">
                          {talent ? `${talent.firstName} ${talent.lastName}` : ct.talent_id}
                        </p>
                        {talent?.stageName && <p className="text-[10px] text-muted-foreground">{talent.stageName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-foreground">&euro;{ct.compenso_lordo.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {statusOptions.filter(s => s !== CampaignTalentStatus.DECLINED).map(status => {
                        const isActive = ct.stato === status;
                        let badgeClass = 'bg-white/[0.04] text-muted-foreground border-white/[0.06] hover:text-foreground/80 cursor-pointer';
                        if (isActive) {
                          if (status === CampaignTalentStatus.PAID) badgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
                          else if (status === CampaignTalentStatus.DELIVERED) badgeClass = 'bg-blue-500/15 text-blue-400 border-blue-500/20';
                          else if (status === CampaignTalentStatus.CONFIRMED) badgeClass = 'bg-green-500/15 text-green-400 border-green-500/20';
                          else if (status === CampaignTalentStatus.PENDING) badgeClass = 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
                          else badgeClass = 'bg-zinc-700/50 text-zinc-300 border-zinc-600/30';
                        }
                        const statusLabel = status === CampaignTalentStatus.INVITED ? 'Invitato'
                          : status === CampaignTalentStatus.PENDING ? 'In Attesa'
                            : status === CampaignTalentStatus.CONFIRMED ? 'Confermato'
                              : status === CampaignTalentStatus.DELIVERED ? 'Consegnato' : 'Pagato';
                        return (
                          <Badge
                            key={status}
                            variant="outline"
                            onClick={() => !isClosed && updateCampaignTalent(ct.id, { stato: status })}
                            className={`cursor-pointer transition-all ${badgeClass} ${isClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {statusLabel}
                          </Badge>
                        );
                      })}

                      {!isClosed && (
                        <button
                          onClick={() => deleteCampaignTalent(ct.id)}
                          className="ml-auto p-1.5 text-muted-foreground hover:text-red-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {ct.note && (
                      <p className="text-[10px] text-muted-foreground bg-white/[0.03] p-2 rounded-lg">{ct.note}</p>
                    )}
                  </GlassCard>
                );
              })}

              {cts.length === 0 && (
                <p className="text-center text-muted-foreground text-xs py-10">Nessun talent associato a questa campagna</p>
              )}

              {/* Add Talent Modal */}
              <Dialog open={showAddTalent} onOpenChange={setShowAddTalent}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-black uppercase tracking-tight">
                      Aggiungi Talent
                    </DialogTitle>
                  </DialogHeader>

                  <SearchInput
                    value={addTalentSearch}
                    onChange={setAddTalentSearch}
                    placeholder="Cerca talent..."
                  />

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {filteredAddTalents.map(t => (
                      <GlassCard
                        key={t.id}
                        variant="interactive"
                        hover
                        onClick={() => setAddTalentId(t.id)}
                        className={`p-3 flex items-center gap-3 cursor-pointer ${
                          addTalentId === t.id ? 'border-primary bg-primary/10' : ''
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          {t.photoUrl ? (
                            <AvatarImage src={t.photoUrl} alt={`${t.firstName} ${t.lastName}`} />
                          ) : null}
                          <AvatarFallback className="text-[9px]">
                            {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-black text-foreground truncate">{t.firstName} {t.lastName}</span>
                        {addTalentId === t.id && <CheckCircle2 size={14} className="text-primary ml-auto" />}
                      </GlassCard>
                    ))}
                  </div>

                  <div>
                    <Label className="block mb-2">Compenso Lordo (&euro;)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={addTalentCompenso || ''}
                      onChange={e => setAddTalentCompenso(Number(e.target.value))}
                    />
                  </div>

                  <Button
                    onClick={handleAddTalentSubmit}
                    disabled={!addTalentId}
                    className="w-full text-[10px] font-black uppercase tracking-widest"
                  >
                    Aggiungi alla Campagna
                  </Button>
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Tab: Cliente */}
          {activeTab === 'cliente' && (
            <div className="space-y-4">
              {client ? (
                <GlassCard variant="prominent" className="p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                      <Building2 size={20} className="text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-foreground">{client.ragione_sociale}</h3>
                      {client.tipo && <Badge variant="glass">{client.tipo}</Badge>}
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    {client.referente && (
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Referente</p>
                        <p className="text-sm font-bold text-foreground">{client.referente}</p>
                      </div>
                    )}
                    {client.email && (
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Email</p>
                        <p className="text-sm font-bold text-foreground">{client.email}</p>
                      </div>
                    )}
                    {client.telefono && (
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Telefono</p>
                        <p className="text-sm font-bold text-foreground">{client.telefono}</p>
                      </div>
                    )}
                  </div>

                  {client.note && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Note</p>
                        <p className="text-sm text-zinc-400 whitespace-pre-wrap">{client.note}</p>
                      </div>
                    </>
                  )}
                </GlassCard>
              ) : (
                <div className="text-center py-10">
                  <Building2 size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Nessun cliente associato</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Attivita */}
          {activeTab === 'attivita' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-foreground uppercase tracking-widest">
                  Attivit&agrave; Collegate ({relatedTasks.length})
                </h3>
                <Button onClick={() => setShowNewTask(true)} size="sm" className="gap-1.5 text-[10px] font-black uppercase tracking-widest">
                  <Plus size={14} /> Nuova
                </Button>
              </div>

              {showNewTask && (
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Titolo attivit&agrave;..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    autoFocus
                    className="flex-1"
                  />
                  <Button onClick={handleAddTask} size="sm" className="text-[10px] font-black uppercase tracking-widest">
                    Aggiungi
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => { setShowNewTask(false); setNewTaskTitle(''); }}>
                    <X size={16} />
                  </Button>
                </div>
              )}

              {relatedTasks.map(task => (
                <GlassCard key={task.id} className="flex items-center gap-3 p-3 group">
                  <button
                    onClick={() => updateTask(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${task.status === TaskStatus.DONE ? 'bg-emerald-500 border-emerald-500' : 'border-white/[0.15] hover:border-primary'}`}
                  >
                    {task.status === TaskStatus.DONE && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                  <span className={`text-sm font-bold flex-1 ${task.status === TaskStatus.DONE ? 'line-through text-muted-foreground/50' : 'text-foreground'}`}>
                    {task.title}
                  </span>
                  {task.due_date && (
                    <span className="text-[10px] text-muted-foreground font-bold">
                      {format(new Date(task.due_date), 'dd MMM', { locale: it })}
                    </span>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </GlassCard>
              ))}

              {relatedTasks.length === 0 && !showNewTask && (
                <p className="text-center text-muted-foreground text-xs py-10">Nessuna attivit&agrave; collegata</p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ==================== MAIN CAMPAIGNS PAGE ====================

const Campaigns: React.FC = () => {
  const {
    campaigns, clients, talents, campaignTalents, deleteCampaign,
    updateCampaign, activateCampaign, showToast
  } = useApp();

  const [showWizard, setShowWizard] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');
  const [tipoFilter, setTipoFilter] = useState<'ALL' | 'Suono' | 'Brand'>('ALL');
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const q = search.toLowerCase();
      const clientName = c.client_id ? clients.find(cl => cl.id === c.client_id)?.ragione_sociale || '' : (c.brand || '');
      const matchSearch = !q || c.name.toLowerCase().includes(q) || clientName.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const matchTipo = tipoFilter === 'ALL' || c.tipo === tipoFilter;
      return matchSearch && matchStatus && matchTipo;
    });
  }, [campaigns, clients, search, statusFilter, tipoFilter]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questa campagna?')) {
      await deleteCampaign(id);
    }
  };

  return (
    <AnimatedContainer className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Campagne"
        subtitle={`${campaigns.length} campagne \u00b7 ${campaigns.filter(c => c.status === CampaignStatus.ACTIVE).length} attive`}
        actions={
          <Button onClick={() => setShowWizard(true)} className="gap-2 text-[10px] font-black uppercase tracking-widest">
            <Plus size={14} />
            <span>Nuova Campagna</span>
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Cerca campagna o cliente..."
          className="flex-1"
        />

        <div className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-white/[0.03] backdrop-blur-sm p-1 text-muted-foreground border border-white/[0.06]">
          {(['ALL', 'Suono', 'Brand'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                tipoFilter === t ? 'bg-white/[0.08] text-foreground shadow-sm border border-white/[0.1]' : 'hover:text-foreground/80'
              }`}
            >
              {t === 'ALL' ? 'Tutti' : t}
            </button>
          ))}
        </div>

        <div className="inline-flex h-10 items-center justify-center gap-1 rounded-xl bg-white/[0.03] backdrop-blur-sm p-1 text-muted-foreground border border-white/[0.06]">
          {(['ALL', CampaignStatus.DRAFT, CampaignStatus.ACTIVE, CampaignStatus.CLOSED] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                statusFilter === s ? 'bg-white/[0.08] text-foreground shadow-sm border border-white/[0.1]' : 'hover:text-foreground/80'
              }`}
            >
              {s === 'ALL' ? 'Tutte' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Tipo</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Nome</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Cliente</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Budget</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Stato</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Talent</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Date</th>
                <th className="text-right px-5 py-3 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredCampaigns.map(campaign => {
                const client = campaign.client_id ? clients.find(c => c.id === campaign.client_id) : null;
                const clientName = client ? client.ragione_sociale : campaign.brand || '-';
                const cts = campaignTalents.filter(ct => ct.campaign_id === campaign.id);
                const involvedTalents = talents.filter(t => cts.some(ct => ct.talent_id === t.id));

                return (
                  <tr
                    key={campaign.id}
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className="border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-all group"
                  >
                    <td className="px-5 py-4">
                      <Badge
                        variant={campaign.tipo === 'Suono' ? 'default' : 'success'}
                        className={campaign.tipo === 'Suono' ? 'bg-purple-500/15 text-purple-400 border-purple-500/20' : ''}
                      >
                        {campaign.tipo || 'Brand'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors">{campaign.name}</p>
                        {(campaign.deadline || campaign.data_fine) && new Date(campaign.deadline || campaign.data_fine!) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) && campaign.status !== CampaignStatus.CLOSED && (
                          <Badge variant="destructive" className="gap-1 animate-pulse text-[8px]">
                            <AlertTriangle size={10} /> URGENTE
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-muted-foreground">{clientName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-foreground">&euro;{campaign.totalBudget.toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={
                        campaign.status === CampaignStatus.ACTIVE ? 'default' :
                        campaign.status === CampaignStatus.CLOSED ? 'secondary' : 'warning'
                      }>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center -space-x-1.5">
                        {involvedTalents.slice(0, 3).map(t => (
                          <Avatar key={t.id} className="h-7 w-7 border-2 border-background" title={`${t.firstName} ${t.lastName}`}>
                            {t.photoUrl ? (
                              <AvatarImage src={t.photoUrl} alt={`${t.firstName} ${t.lastName}`} />
                            ) : null}
                            <AvatarFallback className="text-[8px]">
                              {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {involvedTalents.length > 3 && (
                          <Avatar className="h-7 w-7 border-2 border-background">
                            <AvatarFallback className="text-[8px]">
                              +{involvedTalents.length - 3}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {involvedTalents.length === 0 && <span className="text-muted-foreground/40 text-xs">-</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {campaign.data_inizio ? (
                        <p className="text-[10px] font-bold text-muted-foreground">
                          {format(new Date(campaign.data_inizio), 'dd MMM', { locale: it })}
                          {campaign.data_fine && ` \u2014 ${format(new Date(campaign.data_fine), 'dd MMM', { locale: it })}`}
                        </p>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleDelete(campaign.id, e)}
                        className="opacity-0 group-hover:opacity-100 h-8 w-8 text-muted-foreground hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="py-16 text-center">
            <Briefcase size={40} className="mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Nessuna campagna trovata</p>
            <p className="text-[10px] text-muted-foreground/60 mt-2">Prova a modificare i filtri o crea una nuova campagna</p>
          </div>
        )}
      </GlassCard>

      {/* Wizard Modal */}
      {showWizard && <CampaignWizard onClose={() => setShowWizard(false)} />}

      {/* Detail Panel */}
      <AnimatePresence>
        {selectedCampaignId && (
          <CampaignDetail
            key={selectedCampaignId}
            campaignId={selectedCampaignId}
            onClose={() => setSelectedCampaignId(null)}
          />
        )}
      </AnimatePresence>
    </AnimatedContainer>
  );
};

export default Campaigns;
