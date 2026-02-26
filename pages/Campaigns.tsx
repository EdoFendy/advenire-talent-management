
import React, { useState, useMemo } from 'react';
import {
  Briefcase, Plus, Search, Calendar,
  Users, X, Trash2, ChevronRight, ChevronLeft,
  CheckCircle2, Music, Megaphone, Building2, UserPlus,
  Eye, Edit3, Lock, ListTodo, ArrowRight, Zap, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { CampaignStatus, CampaignTalentStatus, TaskStatus, TaskPriority } from '../types';
import { useApp } from '../context/AppContext';

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-lg"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-2xl shadow-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Nuova Campagna</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              Passo {step} di 5 — {stepLabels[step - 1]}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Step Indicators */}
        <div className="px-6 pt-4 flex gap-2">
          {stepLabels.map((label, i) => (
            <div key={i} className="flex-1">
              <div className={`h-1 rounded-full transition-all ${i + 1 <= step ? 'bg-blue-600' : 'bg-zinc-800'}`} />
              <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${i + 1 <= step ? 'text-blue-400' : 'text-zinc-700'}`}>
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
              <p className="text-sm text-zinc-400 font-bold">Seleziona il tipo di campagna</p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setTipo('Suono')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${tipo === 'Suono'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20 bg-zinc-900/50'
                    }`}
                >
                  <Music size={32} className={tipo === 'Suono' ? 'text-blue-400' : 'text-zinc-500'} />
                  <span className="text-sm font-black uppercase tracking-widest text-white">Suono</span>
                  <span className="text-[10px] text-zinc-500">Campagna musicale</span>
                </button>
                <button
                  onClick={() => setTipo('Brand')}
                  className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${tipo === 'Brand'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20 bg-zinc-900/50'
                    }`}
                >
                  <Megaphone size={32} className={tipo === 'Brand' ? 'text-blue-400' : 'text-zinc-500'} />
                  <span className="text-sm font-black uppercase tracking-widest text-white">Brand</span>
                  <span className="text-[10px] text-zinc-500">Campagna brand / ADV</span>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Dati */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Nome Campagna *</label>
                <input
                  type="text" required
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                  placeholder="es. Lancio Estate 2026"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Budget Totale (€) *</label>
                <input
                  type="number" required min={1}
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                  value={budget || ''}
                  onChange={e => setBudget(Number(e.target.value))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Data Inizio</label>
                  <input
                    type="date"
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                    value={dataInizio}
                    onChange={e => setDataInizio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Data Fine</label>
                  <input
                    type="date"
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                    value={dataFine}
                    onChange={e => setDataFine(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Note</label>
                <textarea
                  rows={3}
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none resize-none"
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
                  <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 focus-within:border-blue-500/50 transition-all">
                    <Search size={16} className="text-zinc-600 mr-3" />
                    <input
                      type="text"
                      placeholder="Cerca cliente..."
                      className="bg-transparent border-none text-xs text-white placeholder-zinc-600 w-full font-bold outline-none"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {filteredClients.map(c => (
                      <button
                        key={c.id}
                        onClick={() => setClientId(c.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${clientId === c.id
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-white/5 hover:border-white/10 bg-zinc-900/30'
                          }`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center">
                          <Building2 size={14} className="text-zinc-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-white truncate">{c.ragione_sociale}</p>
                          {c.referente && <p className="text-[10px] text-zinc-500 truncate">{c.referente}</p>}
                        </div>
                        {clientId === c.id && <CheckCircle2 size={16} className="text-blue-500" />}
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="text-center text-zinc-600 text-xs py-4">Nessun cliente trovato</p>
                    )}
                  </div>
                  <button
                    onClick={() => { setShowNewClient(true); setClientId(''); }}
                    className="w-full py-3 border border-dashed border-white/20 rounded-xl text-zinc-500 font-black uppercase text-[10px] tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={14} /> Crea Nuovo Cliente
                  </button>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-black text-blue-400 uppercase tracking-widest">Nuovo Cliente</p>
                    <button onClick={() => setShowNewClient(false)} className="text-[10px] text-zinc-500 hover:text-white font-bold">
                      Scegli esistente
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Tipo</label>
                      <input
                        type="text"
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                        placeholder="es. Agenzia, Brand..."
                        value={newClient.tipo}
                        onChange={e => setNewClient({ ...newClient, tipo: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Ragione Sociale *</label>
                      <input
                        type="text" required
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                        value={newClient.ragione_sociale}
                        onChange={e => setNewClient({ ...newClient, ragione_sociale: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Referente</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                      value={newClient.referente}
                      onChange={e => setNewClient({ ...newClient, referente: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                        value={newClient.email}
                        onChange={e => setNewClient({ ...newClient, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Telefono</label>
                      <input
                        type="tel"
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
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
              <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 focus-within:border-blue-500/50 transition-all">
                <Search size={16} className="text-zinc-600 mr-3" />
                <input
                  type="text"
                  placeholder="Cerca talent..."
                  className="bg-transparent border-none text-xs text-white placeholder-zinc-600 w-full font-bold outline-none"
                  value={talentSearch}
                  onChange={e => setTalentSearch(e.target.value)}
                />
              </div>

              {selectedTalentIds.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTalentIds.map(id => {
                    const t = talents.find(x => x.id === id);
                    if (!t) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        {t.firstName} {t.lastName}
                        <button onClick={() => toggleTalent(id)} className="hover:text-white"><X size={12} /></button>
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {filteredTalents.map(t => {
                  const selected = selectedTalentIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTalent(t.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${selected
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-white/5 hover:border-white/10 bg-zinc-900/30'
                        }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/5">
                        {t.photoUrl ? (
                          <img src={t.photoUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] font-black uppercase">
                            {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-white truncate">{t.firstName} {t.lastName}</p>
                        {t.stageName && <p className="text-[10px] text-zinc-500 truncate">{t.stageName}</p>}
                      </div>
                      {selected && <CheckCircle2 size={16} className="text-blue-500" />}
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-zinc-600 font-bold text-center">
                {selectedTalentIds.length} talent selezionat{selectedTalentIds.length === 1 ? 'o' : 'i'}
              </p>
            </div>
          )}

          {/* Step 5: Compensi */}
          {step === 5 && (
            <div className="space-y-4">
              {selectedTalentIds.length === 0 ? (
                <p className="text-center text-zinc-500 text-xs py-8">Nessun talent selezionato</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {selectedTalentIds.map(id => {
                      const t = talents.find(x => x.id === id);
                      if (!t) return null;
                      return (
                        <div key={id} className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-xl border border-white/5">
                          <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-white/5">
                            {t.photoUrl ? (
                              <img src={t.photoUrl} className="w-full h-full object-cover" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] font-black uppercase">
                                {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-black text-white truncate">{t.firstName} {t.lastName}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-zinc-500 text-sm font-bold">€</span>
                            <input
                              type="number"
                              min={0}
                              className="w-28 bg-zinc-900/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none text-right"
                              placeholder="0"
                              value={compensi[id] || ''}
                              onChange={e => setCompensi(prev => ({ ...prev, [id]: Number(e.target.value) }))}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Budget Totale</span>
                      <span className="text-sm font-black text-white">€{budget.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Totale Compensi</span>
                      <span className="text-sm font-black text-blue-400">€{totalCompensi.toLocaleString()}</span>
                    </div>
                    <div className="h-px bg-white/5" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Budget Residuo</span>
                      <span className={`text-sm font-black ${budgetResiduo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        €{budgetResiduo.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {budgetResiduo < 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
                      <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                        Attenzione: il totale dei compensi supera il budget di €{Math.abs(budgetResiduo).toLocaleString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex justify-between items-center">
          <button
            onClick={() => step > 1 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-2 text-zinc-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all"
          >
            <ChevronLeft size={14} />
            {step > 1 ? 'Indietro' : 'Annulla'}
          </button>

          {step < 5 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-blue-500/20"
            >
              Avanti <ChevronRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-emerald-500/20"
            >
              {isSubmitting ? 'Creazione...' : 'Crea Campagna'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
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

  const tabs = [
    { id: 'panoramica', label: 'Panoramica', icon: <Eye size={14} /> },
    { id: 'talenti', label: 'Talenti', icon: <Users size={14} /> },
    { id: 'cliente', label: 'Cliente', icon: <Building2 size={14} /> },
    { id: 'attivita', label: 'Attività', icon: <ListTodo size={14} /> }
  ];

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
        className="relative w-full max-w-4xl h-full bg-[#0c0c0c] border-l border-white/10 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 bg-zinc-900/50">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${campaign.status === CampaignStatus.ACTIVE ? 'bg-blue-500/20 text-blue-400' :
                  campaign.status === CampaignStatus.CLOSED ? 'bg-zinc-700/50 text-zinc-400' : 'bg-amber-500/20 text-amber-400'
                  }`}>
                  {campaign.status}
                </span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${campaign.tipo === 'Suono' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                  {campaign.tipo || 'Brand'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">{campaign.name}</h2>
              {client && <p className="text-xs text-zinc-500 font-bold mt-1">{client.ragione_sociale}</p>}
              <div className="flex items-center gap-4 mt-2 text-[10px] text-zinc-500 font-bold">
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
              <button onClick={handleStartEdit} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all" title="Modifica">
                <Edit3 size={16} />
              </button>
              {campaign.status === CampaignStatus.DRAFT ? (
                <button onClick={handleToggleStatus} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20">
                  <Zap size={14} /> Attiva Campagna
                </button>
              ) : (
                <button onClick={handleToggleStatus} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all" title={isClosed ? 'Riapri' : 'Chiudi'}>
                  {isClosed ? <CheckCircle2 size={16} /> : <Lock size={16} />}
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-white transition-all">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex p-3 gap-1 border-b border-white/5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'}`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Tab: Panoramica */}
          {activeTab === 'panoramica' && (
            <div className="space-y-6">
              {isEditing ? (
                <div className="space-y-4 bg-zinc-900/30 p-6 rounded-2xl border border-white/5">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Nome</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                      value={editData.name}
                      onChange={e => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Data Inizio</label>
                      <input type="date" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none" value={editData.data_inizio} onChange={e => setEditData({ ...editData, data_inizio: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Data Fine</label>
                      <input type="date" className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none" value={editData.data_fine} onChange={e => setEditData({ ...editData, data_fine: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Note</label>
                    <textarea rows={3} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none resize-none" value={editData.notes} onChange={e => setEditData({ ...editData, notes: e.target.value })} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all">Salva</button>
                    <button onClick={() => setIsEditing(false)} className="px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all">Annulla</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Budget</p>
                      <p className="text-2xl font-black text-white">€{campaign.totalBudget.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Compensi Talent</p>
                      <p className="text-2xl font-black text-blue-400">€{totalCompensi.toLocaleString()}</p>
                    </div>
                    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Margine</p>
                      <p className={`text-2xl font-black ${(campaign.totalBudget - totalCompensi) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        €{(campaign.totalBudget - totalCompensi).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Incassato</p>
                      <p className="text-xl font-black text-emerald-400">€{totalIncomeReceived.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-600 font-bold mt-1">
                        su €{campaignIncome.reduce((s, i) => s + i.amount, 0).toLocaleString()} pianificato
                      </p>
                    </div>
                    <div className="bg-zinc-900/50 p-5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Talent Pagati</p>
                      <p className="text-xl font-black text-white">{cts.filter(ct => ct.stato === CampaignTalentStatus.PAID).length} / {cts.length}</p>
                      <p className="text-[10px] text-zinc-600 font-bold mt-1">
                        €{totalPaid.toLocaleString()} su €{totalCompensi.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {campaign.notes && (
                    <div className="bg-zinc-900/30 p-5 rounded-2xl border border-white/5">
                      <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Note</p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{campaign.notes}</p>
                    </div>
                  )}

                  {/* Income Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-black text-zinc-400 uppercase tracking-widest">Piano di Fatturazione</h4>
                    </div>
                    {campaignIncome.map(inc => (
                      <div key={inc.id} className="bg-zinc-900/50 p-4 rounded-xl border border-white/5 flex justify-between items-center group">
                        <div>
                          <p className="text-sm font-bold text-white">{inc.note || 'Fattura'}</p>
                          <p className="text-[10px] text-zinc-500">{format(new Date(inc.date), 'dd MMM yyyy', { locale: it })}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-black text-white">€{inc.amount.toLocaleString()}</p>
                          <button
                            onClick={() => updateIncome(inc.id, { status: inc.status === 'received' ? 'pending' : 'received' })}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${inc.status === 'received' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
                          >
                            {inc.status === 'received' ? 'Incassato' : 'In attesa'}
                          </button>
                          <button onClick={() => deleteIncome(inc.id)} className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {showIncomeForm ? (
                      <div className="bg-zinc-900 border border-blue-500/30 rounded-xl p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-[9px] font-bold text-zinc-500 uppercase">Importo (€)</label>
                            <input type="number" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold focus:outline-none" value={newIncomeData.amount || ''} onChange={e => setNewIncomeData({ ...newIncomeData, amount: Number(e.target.value) })} />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-zinc-500 uppercase">Data</label>
                            <input type="date" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold focus:outline-none" value={newIncomeData.date} onChange={e => setNewIncomeData({ ...newIncomeData, date: e.target.value })} />
                          </div>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">Descrizione</label>
                          <input type="text" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold focus:outline-none" placeholder="es. Acconto 30%" value={newIncomeData.note} onChange={e => setNewIncomeData({ ...newIncomeData, note: e.target.value })} />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              if (newIncomeData.amount <= 0) return;
                              await addIncome({ campaignId: campaign.id, ...newIncomeData, status: 'pending' });
                              setShowIncomeForm(false);
                              setNewIncomeData({ amount: 0, note: '', date: format(new Date(), 'yyyy-MM-dd') });
                            }}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-xs font-black uppercase tracking-widest"
                          >
                            Salva
                          </button>
                          <button onClick={() => setShowIncomeForm(false)} className="px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowIncomeForm(true)} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-zinc-500 font-black uppercase text-[10px] tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2">
                        <Plus size={14} /> Aggiungi Fattura / Incasso
                      </button>
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
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  Talenti Coinvolti ({cts.length})
                </h3>
                {!isClosed && (
                  <button onClick={() => setShowAddTalent(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    <UserPlus size={14} /> Aggiungi
                  </button>
                )}
              </div>

              {cts.map(ct => {
                const talent = talents.find(t => t.id === ct.talent_id);
                const statusOptions = Object.values(CampaignTalentStatus);
                return (
                  <div key={ct.id} className="bg-zinc-900/50 border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border-2 border-white/5">
                        {talent?.photoUrl ? (
                          <img src={talent.photoUrl} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-600 text-xs font-black uppercase">
                            {talent ? `${talent.firstName.charAt(0)}${talent.lastName.charAt(0)}` : '?'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-white">
                          {talent ? `${talent.firstName} ${talent.lastName}` : ct.talent_id}
                        </p>
                        {talent?.stageName && <p className="text-[10px] text-zinc-500">{talent.stageName}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-white">€{ct.compenso_lordo.toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {statusOptions.filter(s => s !== CampaignTalentStatus.DECLINED).map(status => {
                        const statusStyle = ct.stato === status
                          ? status === CampaignTalentStatus.PAID ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : status === CampaignTalentStatus.DELIVERED ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : status === CampaignTalentStatus.CONFIRMED ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : status === CampaignTalentStatus.PENDING ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                  : 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/30'
                          : 'bg-zinc-900/50 text-zinc-600 border border-white/5 hover:text-zinc-400';
                        const statusLabel = status === CampaignTalentStatus.INVITED ? 'Invitato'
                          : status === CampaignTalentStatus.PENDING ? 'In Attesa'
                            : status === CampaignTalentStatus.CONFIRMED ? 'Confermato'
                              : status === CampaignTalentStatus.DELIVERED ? 'Consegnato' : 'Pagato';
                        return (
                          <button
                            key={status}
                            onClick={() => !isClosed && updateCampaignTalent(ct.id, { stato: status })}
                            disabled={isClosed}
                            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${statusStyle} ${isClosed ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            {statusLabel}
                          </button>
                        );
                      })}

                      {!isClosed && (
                        <button
                          onClick={() => deleteCampaignTalent(ct.id)}
                          className="ml-auto p-1.5 text-zinc-600 hover:text-red-400 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {ct.note && (
                      <p className="text-[10px] text-zinc-500 bg-zinc-900/30 p-2 rounded-lg">{ct.note}</p>
                    )}
                  </div>
                );
              })}

              {cts.length === 0 && (
                <p className="text-center text-zinc-600 text-xs py-10">Nessun talent associato a questa campagna</p>
              )}

              {/* Add Talent Modal */}
              <AnimatePresence>
                {showAddTalent && (
                  <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddTalent(false)} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
                    <motion.div
                      initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                      className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-md shadow-3xl p-6 space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight">Aggiungi Talent</h3>
                        <button onClick={() => setShowAddTalent(false)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white"><X size={16} /></button>
                      </div>

                      <div className="flex items-center bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5">
                        <Search size={14} className="text-zinc-600 mr-2" />
                        <input type="text" placeholder="Cerca talent..." className="bg-transparent border-none text-xs text-white placeholder-zinc-600 w-full font-bold outline-none" value={addTalentSearch} onChange={e => setAddTalentSearch(e.target.value)} />
                      </div>

                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {filteredAddTalents.map(t => (
                          <button key={t.id} onClick={() => setAddTalentId(t.id)} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${addTalentId === t.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:border-white/10 bg-zinc-900/30'}`}>
                            <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0">
                              {t.photoUrl ? <img src={t.photoUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[9px] font-black uppercase">{t.firstName.charAt(0)}{t.lastName.charAt(0)}</div>}
                            </div>
                            <span className="text-xs font-black text-white truncate">{t.firstName} {t.lastName}</span>
                            {addTalentId === t.id && <CheckCircle2 size={14} className="text-blue-500 ml-auto" />}
                          </button>
                        ))}
                      </div>

                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Compenso Lordo (€)</label>
                        <input type="number" min={0} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none" value={addTalentCompenso || ''} onChange={e => setAddTalentCompenso(Number(e.target.value))} />
                      </div>

                      <button onClick={handleAddTalentSubmit} disabled={!addTalentId} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest py-3 rounded-xl transition-all">
                        Aggiungi alla Campagna
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Tab: Cliente */}
          {activeTab === 'cliente' && (
            <div className="space-y-4">
              {client ? (
                <div className="bg-zinc-900/30 rounded-2xl border border-white/5 p-6 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
                      <Building2 size={20} className="text-zinc-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">{client.ragione_sociale}</h3>
                      {client.tipo && <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{client.tipo}</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {client.referente && (
                      <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Referente</p>
                        <p className="text-sm font-bold text-white">{client.referente}</p>
                      </div>
                    )}
                    {client.email && (
                      <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Email</p>
                        <p className="text-sm font-bold text-white">{client.email}</p>
                      </div>
                    )}
                    {client.telefono && (
                      <div>
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Telefono</p>
                        <p className="text-sm font-bold text-white">{client.telefono}</p>
                      </div>
                    )}
                  </div>

                  {client.note && (
                    <div>
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Note</p>
                      <p className="text-sm text-zinc-400 whitespace-pre-wrap">{client.note}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-10">
                  <Building2 size={40} className="mx-auto text-zinc-800 mb-3" />
                  <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">Nessun cliente associato</p>
                </div>
              )}
            </div>
          )}

          {/* Tab: Attività */}
          {activeTab === 'attivita' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  Attività Collegate ({relatedTasks.length})
                </h3>
                <button
                  onClick={() => setShowNewTask(true)}
                  className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <Plus size={14} /> Nuova
                </button>
              </div>

              {showNewTask && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Titolo attività..."
                    className="flex-1 bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                    autoFocus
                  />
                  <button onClick={handleAddTask} className="bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-xl text-[10px] font-black uppercase tracking-widest">
                    Aggiungi
                  </button>
                  <button onClick={() => { setShowNewTask(false); setNewTaskTitle(''); }} className="p-2 text-zinc-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
              )}

              {relatedTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-zinc-900/30 rounded-xl border border-white/5 group">
                  <button
                    onClick={() => updateTask(task.id, { status: task.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE })}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${task.status === TaskStatus.DONE ? 'bg-emerald-500 border-emerald-500' : 'border-zinc-600 hover:border-blue-500'}`}
                  >
                    {task.status === TaskStatus.DONE && <CheckCircle2 size={12} className="text-white" />}
                  </button>
                  <span className={`text-sm font-bold flex-1 ${task.status === TaskStatus.DONE ? 'line-through text-zinc-600' : 'text-white'}`}>
                    {task.title}
                  </span>
                  {task.due_date && (
                    <span className="text-[10px] text-zinc-500 font-bold">
                      {format(new Date(task.due_date), 'dd MMM', { locale: it })}
                    </span>
                  )}
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {relatedTasks.length === 0 && !showNewTask && (
                <p className="text-center text-zinc-600 text-xs py-10">Nessuna attività collegata</p>
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
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Campagne</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            {campaigns.length} campagne &middot; {campaigns.filter(c => c.status === CampaignStatus.ACTIVE).length} attive
          </p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={14} />
          <span>Nuova Campagna</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 flex items-center bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 focus-within:border-blue-500/50 transition-all">
          <Search size={16} className="text-zinc-600 mr-3" />
          <input
            type="text"
            placeholder="Cerca campagna o cliente..."
            className="bg-transparent border-none text-xs text-white placeholder-zinc-600 w-full font-bold outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex items-center bg-zinc-900/50 p-1 rounded-xl border border-white/5">
          {(['ALL', 'Suono', 'Brand'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tipoFilter === t ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              {t === 'ALL' ? 'Tutti' : t}
            </button>
          ))}
        </div>

        <div className="flex items-center bg-zinc-900/50 p-1 rounded-xl border border-white/5">
          {(['ALL', CampaignStatus.DRAFT, CampaignStatus.ACTIVE, CampaignStatus.CLOSED] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'}`}
            >
              {s === 'ALL' ? 'Tutte' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Tipo</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Nome</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Cliente</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Budget</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Stato</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Talent</th>
                <th className="text-left px-5 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Date</th>
                <th className="text-right px-5 py-3 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Azioni</th>
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
                    className="border-b border-white/5 hover:bg-zinc-900/30 cursor-pointer transition-all group"
                  >
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${campaign.tipo === 'Suono' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {campaign.tipo || 'Brand'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white group-hover:text-blue-400 transition-colors">{campaign.name}</p>
                        {(campaign.deadline || campaign.data_fine) && new Date(campaign.deadline || campaign.data_fine!) <= new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) && campaign.status !== CampaignStatus.CLOSED && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest border border-red-500/30 animate-pulse">
                            <AlertTriangle size={10} /> URGENTE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs font-bold text-zinc-400">{clientName}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-black text-white">€{campaign.totalBudget.toLocaleString()}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${campaign.status === CampaignStatus.ACTIVE ? 'bg-blue-500/20 text-blue-400' :
                        campaign.status === CampaignStatus.CLOSED ? 'bg-zinc-700/50 text-zinc-400' : 'bg-amber-500/20 text-amber-400'
                        }`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center -space-x-1.5">
                        {involvedTalents.slice(0, 3).map(t => (
                          <div key={t.id} className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden border-2 border-[#0c0c0c]" title={`${t.firstName} ${t.lastName}`}>
                            {t.photoUrl ? <img src={t.photoUrl} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-black text-zinc-600">{t.firstName.charAt(0)}{t.lastName.charAt(0)}</div>}
                          </div>
                        ))}
                        {involvedTalents.length > 3 && (
                          <div className="w-7 h-7 rounded-full bg-zinc-800 border-2 border-[#0c0c0c] flex items-center justify-center text-[8px] font-bold text-zinc-500">
                            +{involvedTalents.length - 3}
                          </div>
                        )}
                        {involvedTalents.length === 0 && <span className="text-zinc-700 text-xs">-</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {campaign.data_inizio ? (
                        <p className="text-[10px] font-bold text-zinc-500">
                          {format(new Date(campaign.data_inizio), 'dd MMM', { locale: it })}
                          {campaign.data_fine && ` — ${format(new Date(campaign.data_fine), 'dd MMM', { locale: it })}`}
                        </p>
                      ) : (
                        <span className="text-zinc-700 text-xs">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={(e) => handleDelete(campaign.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredCampaigns.length === 0 && (
          <div className="py-16 text-center">
            <Briefcase size={40} className="mx-auto text-zinc-800 mb-3" />
            <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">Nessuna campagna trovata</p>
            <p className="text-[10px] text-zinc-700 mt-2">Prova a modificare i filtri o crea una nuova campagna</p>
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      <AnimatePresence>
        {showWizard && <CampaignWizard onClose={() => setShowWizard(false)} />}
      </AnimatePresence>

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
    </motion.div>
  );
};

export default Campaigns;
