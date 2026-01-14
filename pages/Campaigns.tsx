import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Briefcase, Plus, Search, Calendar, DollarSign,
  TrendingUp, Users, ArrowUpRight, Filter, AlertCircle,
  MoreHorizontal, CheckCircle2, X,
  Clock, Save, ArrowRight, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Campaign, Collaboration, Talent, Brand, CampaignStatus, PaymentStatus, Income } from '../types';
import { useApp } from '../context/AppContext';

interface CampaignsProps {
  campaigns: Campaign[];
  brands: Brand[];
  addCampaign: (campaign: any, linkTalent?: any) => Promise<Campaign>;
  addCollaboration: (collab: any, apps?: any[]) => Promise<Collaboration>;
  collaborations: Collaboration[];
  talents: Talent[];
  updateCollaboration: (id: string, updates: Partial<Collaboration>) => Promise<Collaboration>;
  income: Income[];
  addIncome: (income: any) => Promise<Income>;
  updateIncome: (id: string, updates: Partial<Income>) => Promise<Income>;
  deleteIncome: (id: string) => Promise<void>;
}

interface CampaignDetailsPanelProps {
  campaign: Campaign;
  collaborations: Collaboration[];
  talents: Talent[];
  income: Income[];
  onClose: () => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  updateCollaboration: (id: string, updates: Partial<Collaboration>) => Promise<Collaboration>;
  addIncome: (income: any) => Promise<Income>;
  updateIncome: (id: string, updates: Partial<Income>) => Promise<Income>;
  deleteIncome: (id: string) => Promise<void>;
}

const CampaignDetailsPanel: React.FC<CampaignDetailsPanelProps> = React.memo(({
  campaign,
  collaborations,
  talents,
  income,
  onClose,
  updateCampaign,
  updateCollaboration,
  addIncome,
  updateIncome,
  deleteIncome
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'finance' | 'talents'>('overview');
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [newIncomeData, setNewIncomeData] = useState({
    amount: 0,
    note: 'Fattura acconto',
    date: format(new Date(), 'yyyy-MM-dd')
  });

  const handleUpdateCollaborationPayment = useCallback(async (collabId: string, amount: number, fee: number) => {
    let newStatus = PaymentStatus.UNPAID;
    if (amount >= fee) newStatus = PaymentStatus.PAID;
    else if (amount > 0) newStatus = PaymentStatus.PENDING;

    await updateCollaboration(collabId, {
      paidAmount: amount,
      paymentStatus: newStatus
    });
  }, [updateCollaboration]);

  // Derived Data
  const campaignCollabs = useMemo(() => collaborations.filter(c => c.campaignId === campaign.id), [collaborations, campaign.id]);
  const totalSpent = useMemo(() => campaignCollabs.reduce((acc, c) => acc + c.fee, 0), [campaignCollabs]);
  const totalPaid = useMemo(() => campaignCollabs.reduce((acc, c) => acc + (c.paidAmount || 0), 0), [campaignCollabs]);
  const margin = campaign.totalBudget - totalSpent;
  const marginPercent = ((margin / campaign.totalBudget) * 100).toFixed(1);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl h-full bg-[#0c0c0c] border-l border-white/10 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-start bg-zinc-900/50">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest ${campaign.status === CampaignStatus.ACTIVE ? 'bg-blue-500/20 text-blue-400' :
                campaign.status === CampaignStatus.CLOSED ? 'bg-zinc-700/50 text-zinc-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                {campaign.status}
              </span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{campaign.brand}</span>
            </div>
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">{campaign.name}</h2>
            <div className="flex items-center space-x-6 mt-4 text-xs font-bold text-zinc-400">
              <span className="flex items-center"><Calendar size={14} className="mr-2" /> Creata il: {format(new Date(), 'dd MMM yyyy')}</span>
              {campaign.deadline && <span className="flex items-center text-red-400"><Clock size={14} className="mr-2" /> Scadenza: {format(new Date(campaign.deadline), 'dd MMM yyyy')}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-500 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-4 gap-2 border-b border-white/5">
          {[
            { id: 'overview', label: 'Panoramica', icon: <TrendingUp size={16} /> },
            { id: 'talents', label: 'Gestione Talent & Pagamenti', icon: <Users size={16} /> },
            { id: 'finance', label: 'Incassi & Budget', icon: <DollarSign size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
                }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-3 gap-6">
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Budget Totale</p>
                  <p className="text-3xl font-black text-white">€{campaign.totalBudget.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Spesa Talent</p>
                  <p className="text-3xl font-black text-blue-400">€{totalSpent.toLocaleString()}</p>
                </div>
                <div className="bg-zinc-900/50 p-6 rounded-3xl border border-white/5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Margine Agenzia</p>
                  <p className="text-3xl font-black text-emerald-500">€{margin.toLocaleString()}</p>
                  <p className="text-[10px] font-bold text-emerald-500/50 mt-1">{marginPercent}% del totale</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Timeline & Note</h3>
                <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Note Campagna</label>
                    <textarea
                      className="w-full bg-transparent border-b border-white/10 text-zinc-300 font-bold mt-2 focus:outline-none focus:border-blue-500 transition-colors resize-none"
                      rows={4}
                      defaultValue={campaign.notes || 'Nessuna nota aggiuntiva.'}
                      onBlur={(e) => updateCampaign(campaign.id, { notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'talents' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Pagamenti ai Talent</h3>
                <div className="text-right">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Totale Pagato</p>
                  <p className="text-xl font-black text-emerald-500">€{totalPaid.toLocaleString()} <span className="text-zinc-600">/ €{totalSpent.toLocaleString()}</span></p>
                </div>
              </div>

              <div className="space-y-4">
                {campaignCollabs.map(collab => {
                  const talent = talents.find(t => t.id === collab.talentId);
                  return (
                    <div key={collab.id} className="bg-zinc-900/50 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-blue-500/20 transition-all">
                      <div className="flex items-center space-x-4 min-w-[200px]">
                        <img src={talent?.photoUrl} className="w-12 h-12 rounded-2xl object-cover bg-zinc-800" alt="" />
                        <div>
                          <p className="font-black text-white text-lg leading-tight">{talent?.stageName}</p>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">{collab.type}</p>
                        </div>
                      </div>

                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
                          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Fee Totale</p>
                          <p className="text-xl font-black text-white">€{collab.fee.toLocaleString()}</p>
                        </div>

                        <div className="bg-black/40 rounded-2xl p-3 border border-white/5">
                          <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest mb-1">Già Corrisposto</p>
                          <div className="flex items-center">
                            <span className="text-zinc-500 font-bold mr-1">€</span>
                            <input
                              type="number"
                              className="bg-transparent w-full font-black text-white focus:outline-none"
                              defaultValue={collab.paidAmount || 0}
                              onBlur={(e) => handleUpdateCollaborationPayment(collab.id, Number(e.target.value), collab.fee)}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end">
                          <button
                            onClick={() => {
                              const newAmount = collab.paymentStatus === PaymentStatus.PAID ? 0 : collab.fee;
                              handleUpdateCollaborationPayment(collab.id, newAmount, collab.fee);
                            }}
                            className={`w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all flex items-center justify-center space-x-2 ${collab.paymentStatus === PaymentStatus.PAID ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              collab.paymentStatus === PaymentStatus.PENDING ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                'bg-zinc-800 text-zinc-400 border border-white/5 hover:bg-zinc-700'
                              }`}
                          >
                            {collab.paymentStatus === PaymentStatus.PAID ? <CheckCircle2 size={14} /> : <Clock size={14} />}
                            <span>{collab.paymentStatus}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {campaignCollabs.length === 0 && <p className="text-zinc-500 font-bold text-center py-10">Nessun talent associato a questa campagna.</p>}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {(() => {
                const campaignIncome = income.filter(i => i.campaignId === campaign.id);
                const totalIncomeDeclared = campaignIncome.reduce((acc, i) => acc + i.amount, 0);
                const remainingToInvoice = campaign.totalBudget - totalIncomeDeclared;

                return (
                  <>
                    <div className="bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-blue-500/20 rounded-3xl p-8 text-center space-y-2">
                      <p className="text-xs font-black text-blue-400 uppercase tracking-[0.2em]">Incasso Totale Previsto</p>
                      <h3 className="text-5xl font-black text-white tracking-tighter">€{campaign.totalBudget.toLocaleString()}</h3>
                      <p className="text-zinc-400 font-bold text-sm">da {campaign.brand}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Piano di Fatturazione</h4>
                          <span className={`text-[10px] font-bold ${remainingToInvoice > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                            {remainingToInvoice > 0 ? `Da pianificare: €${remainingToInvoice.toLocaleString()}` : 'Completo'}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {campaignIncome.map(inc => (
                            <div key={inc.id} className="bg-zinc-900/50 p-4 rounded-2xl border border-white/5 flex flex-col gap-2 group hover:border-blue-500/30 transition-all">
                              <div className="flex justify-between items-center">
                                <div>
                                  <p className="text-white font-bold">{inc.note || 'Fattura'}</p>
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{format(new Date(inc.date), 'dd MMM yyyy')}</p>
                                </div>
                                <div className="text-right">
                                  <p className="font-black text-white text-lg">€{inc.amount.toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-2 border-t border-white/5 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => updateIncome(inc.id, { status: inc.status === 'received' ? 'pending' : 'received' })}
                                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${inc.status === 'received' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
                                >
                                  {inc.status === 'received' ? 'Incassato' : 'In attesa'}
                                </button>
                                <button onClick={() => deleteIncome(inc.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          {campaignIncome.length === 0 && !showIncomeForm && (
                            <p className="text-center text-zinc-500 text-xs py-4">Nessuna fattura registrata</p>
                          )}
                        </div>

                        {showIncomeForm ? (
                          <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[9px] font-bold text-zinc-500 uppercase">Importo</label>
                                <input
                                  type="number"
                                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold"
                                  value={newIncomeData.amount}
                                  onChange={e => setNewIncomeData({ ...newIncomeData, amount: Number(e.target.value) })}
                                />
                              </div>
                              <div>
                                <label className="text-[9px] font-bold text-zinc-500 uppercase">Data Prevista</label>
                                <input
                                  type="date"
                                  className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold"
                                  value={newIncomeData.date}
                                  onChange={e => setNewIncomeData({ ...newIncomeData, date: e.target.value })}
                                />
                              </div>
                            </div>
                            <div>
                              <label className="text-[9px] font-bold text-zinc-500 uppercase">Descrizione</label>
                              <input
                                type="text"
                                className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-bold"
                                placeholder="es. Acconto 30%"
                                value={newIncomeData.note}
                                onChange={e => setNewIncomeData({ ...newIncomeData, note: e.target.value })}
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button
                                onClick={async () => {
                                  if (newIncomeData.amount <= 0) return;
                                  await addIncome({
                                    campaignId: campaign.id,
                                    ...newIncomeData,
                                    status: 'pending'
                                  });
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
                          <button onClick={() => setShowIncomeForm(true)} className="w-full py-4 border border-dashed border-white/20 rounded-2xl text-zinc-500 font-black uppercase text-xs tracking-widest hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center space-x-2">
                            <Plus size={16} /> <span>Aggiungi Fattura / Incasso</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest border-b border-white/10 pb-2">Riepilogo Margini Reale</h4>
                        <div className="bg-zinc-900/30 p-6 rounded-2xl border border-white/5 space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 font-bold text-sm">Totale Uscite (Talent)</span>
                            <span className="text-white font-black">€{totalSpent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-400 font-bold text-sm">Totale Previsto</span>
                            <span className="text-white font-black">€{campaign.totalBudget.toLocaleString()}</span>
                          </div>
                          <div className="h-px bg-white/10" />
                          <div className="flex justify-between items-center">
                            <span className="text-blue-400 font-black uppercase tracking-widest text-xs">Margine Stimato</span>
                            <span className="text-emerald-500 font-black text-xl">
                              €{(campaign.totalBudget - totalSpent).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
});

const Campaigns: React.FC<CampaignsProps> = ({ campaigns, brands, addCampaign, addCollaboration, collaborations, talents, updateCollaboration, income, addIncome, updateIncome, deleteIncome }) => {
  const { updateCampaign, deleteCampaign, showToast } = useApp();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CampaignStatus>('ALL');

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);

  // Open details panel
  const openDetails = useCallback((campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setDetailsPanelOpen(true);
  }, []);

  // Get the current version of selected campaign from campaigns array
  const currentCampaign = useMemo(() => {
    if (!selectedCampaign) return null;
    return campaigns.find(c => c.id === selectedCampaign.id) || selectedCampaign;
  }, [campaigns, selectedCampaign]);

  // Form State
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    brand: '',
    period: '',
    deadline: '',
    totalBudget: 0,
    agencyFeePercent: 30, // Default 30%
    notes: ''
  });

  // Link Talent State within Campaign Creation
  const [linkTalent, setLinkTalent] = useState({
    enabled: false,
    talentId: '',
    activityDate: format(new Date(), 'yyyy-MM-dd'),
    type: 'Shooting + Social Kit'
  });

  // Calculate fees live
  const calculatedTalentFee = Math.floor(newCampaign.totalBudget * (1 - newCampaign.agencyFeePercent / 100));
  const calculatedAgencyFee = newCampaign.totalBudget - calculatedTalentFee;

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.brand.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [campaigns, search, statusFilter]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCampaign(
        newCampaign,
        linkTalent.enabled ? linkTalent : undefined
      );
      setShowAddModal(false);
      resetForm();
    } catch (error: any) {
      console.error(error);
      showToast(error.message || 'Errore durante la creazione della campagna', 'error');
    }
  };

  const resetForm = () => {
    setNewCampaign({
      name: '',
      brand: '',
      period: '',
      deadline: '',
      totalBudget: 0,
      agencyFeePercent: 30,
      notes: ''
    });
    setLinkTalent({
      enabled: false,
      talentId: '',
      activityDate: format(new Date(), 'yyyy-MM-dd'),
      type: 'Shooting + Social Kit'
    });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questa campagna?')) {
      await deleteCampaign(id);
    }
  };

  const toggleStatus = async (campaign: Campaign, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = campaign.status === CampaignStatus.ACTIVE ? CampaignStatus.CLOSED : CampaignStatus.ACTIVE;
    await updateCampaign(campaign.id, { status: newStatus });
    showToast(`Campagna ${campaign.name} aggiornata a ${newStatus}`, 'success');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20">
      <AnimatePresence mode="wait">
        {detailsPanelOpen && currentCampaign && (
          <CampaignDetailsPanel
            key={currentCampaign.id}
            campaign={currentCampaign}
            collaborations={collaborations}
            talents={talents}
            income={income}
            onClose={() => setDetailsPanelOpen(false)}
            updateCampaign={updateCampaign}
            updateCollaboration={updateCollaboration}
            addIncome={addIncome}
            updateIncome={updateIncome}
            deleteIncome={deleteIncome}
          />
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Campagne</h1>
          <p className="text-zinc-500 font-medium text-lg">Pianificazione strategica e gestione budget.</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95"
        >
          <Plus size={20} />
          <span>Nuova Campagna</span>
        </button>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Briefcase size={20} /></span>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Attive</span>
          </div>
          <p className="text-4xl font-black text-white">{campaigns.filter(c => c.status === CampaignStatus.ACTIVE).length}</p>
          <p className="text-xs text-zinc-500 mt-2 font-bold">In corso questo mese</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><DollarSign size={20} /></span>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Budget Totale</span>
          </div>
          <p className="text-4xl font-black text-white">€{campaigns.reduce((acc, c) => acc + c.totalBudget, 0).toLocaleString()}</p>
          <p className="text-xs text-zinc-500 mt-2 font-bold">Volume d'affari gestito</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
          <div className="flex items-center justify-between mb-4">
            <span className="p-3 bg-purple-500/10 text-purple-500 rounded-xl"><TrendingUp size={20} /></span>
            <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">Fee Agenzia Est.</span>
          </div>
          <p className="text-4xl font-black text-white">
            €{campaigns.reduce((acc, c) => acc + (c.totalBudget * (c.agencyFeePercent / 100)), 0).toLocaleString()}
          </p>
          <p className="text-xs text-zinc-500 mt-2 font-bold">Margine medio: 30%</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-zinc-900/40 p-3 rounded-3xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center bg-zinc-800/80 rounded-2xl px-5 py-3 flex-1 border border-white/5 focus-within:border-blue-500/50 transition-all">
          <Search size={18} className="text-zinc-500 mr-3" />
          <input
            type="text"
            placeholder="Cerca campagna o brand..."
            className="bg-transparent border-none text-sm focus:ring-0 text-zinc-200 placeholder-zinc-600 w-full font-bold outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-2 bg-zinc-800/50 p-1.5 rounded-2xl border border-white/5 overflow-x-auto">
          {(['ALL', CampaignStatus.ACTIVE, CampaignStatus.CLOSED, CampaignStatus.DRAFT] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${statusFilter === status
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-zinc-500 hover:text-white'
                }`}
            >
              {status === 'ALL' ? 'Tutte' : status}
            </button>
          ))}
        </div>
      </div>


      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 gap-6">
        <AnimatePresence>
          {filteredCampaigns.map((campaign, idx) => {
            const campaignCollabs = collaborations.filter(c => c.campaignId === campaign.id);
            const talentsInvolved = talents.filter(t => campaignCollabs.some(c => c.talentId === t.id));
            const totalSpent = campaignCollabs.reduce((acc, c) => acc + c.fee, 0);
            const margin = campaign.totalBudget - totalSpent;

            return (
              <motion.div
                key={campaign.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => openDetails(campaign)}
                className={`bg-[#0c0c0c] border rounded-[2.5rem] p-8 cursor-pointer transition-all duration-300 group hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] ${detailsPanelOpen && selectedCampaign?.id === campaign.id ? 'border-blue-500/50 bg-zinc-900/20' : 'border-white/5 hover:border-white/10'
                  }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  <div className="flex items-start space-x-6">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black uppercase text-white shadow-lg ${campaign.status === CampaignStatus.ACTIVE ? 'bg-gradient-to-br from-blue-600 to-indigo-700' :
                      campaign.status === CampaignStatus.CLOSED ? 'bg-zinc-800' : 'bg-amber-600'
                      }`}>
                      {campaign.brand.substring(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-3 mb-1">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${campaign.status === CampaignStatus.ACTIVE ? 'bg-blue-500/20 text-blue-400' :
                          campaign.status === CampaignStatus.CLOSED ? 'bg-zinc-700/50 text-zinc-400' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                          {campaign.status}
                        </span>
                        {campaign.deadline && (
                          <span className="text-[10px] font-bold text-zinc-500 flex items-center">
                            <Clock size={12} className="mr-1" /> Scadenza: {format(new Date(campaign.deadline), 'dd MMM', { locale: it })}
                          </span>
                        )}
                      </div>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">{campaign.name}</h3>
                      <p className="text-zinc-500 font-bold">{campaign.brand}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8">
                    <div className="text-right hidden md:block">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Talent Coinvolti</p>
                      <div className="flex items-center justify-end -space-x-2">
                        {talentsInvolved.slice(0, 3).map(t => (
                          <img key={t.id} src={t.photoUrl} className="w-8 h-8 rounded-full border-2 border-[#0c0c0c]" alt={t.stageName} title={t.stageName} />
                        ))}
                        {talentsInvolved.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-zinc-800 border-2 border-[#0c0c0c] flex items-center justify-center text-[9px] font-bold text-white">
                            +{talentsInvolved.length - 3}
                          </div>
                        )}
                        {talentsInvolved.length === 0 && <span className="text-zinc-600 text-xs font-bold">-</span>}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Budget</p>
                      <p className="text-2xl font-black text-white tracking-tighter">€{campaign.totalBudget.toLocaleString()}</p>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={(e) => toggleStatus(campaign, e)}
                        className="p-3 rounded-xl bg-zinc-900 border border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                        title={campaign.status === CampaignStatus.ACTIVE ? "Chiudi Campagna" : "Riapri Campagna"}
                      >
                        {campaign.status === CampaignStatus.ACTIVE ? <CheckCircle2 size={20} /> : <TrendingUp size={20} />}
                      </button>
                      <button
                        onClick={(e) => handleDelete(campaign.id, e)}
                        className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                </div>


              </motion.div>
            );
          })}
        </AnimatePresence>
      </div >

      {/* Add Campaign Modal */}
      <AnimatePresence>
        {
          showAddModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] w-full max-w-4xl shadow-3xl overflow-hidden p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Nuova Campagna</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Configurazione guidata</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-3 hover:bg-zinc-900 rounded-2xl transition-all text-zinc-500 hover:text-white"><X size={24} /></button>
                </div>

                <form onSubmit={handleAdd} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left Col: Dati Principali */}
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest border-b border-blue-500/20 pb-2">Dati Contratto</h4>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Nome Campagna</label>
                          <input required type="text" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="es. Summer Collection Launch" value={newCampaign.name} onChange={e => setNewCampaign({ ...newCampaign, name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Brand Cliente</label>
                          <select
                            required
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                            value={newCampaign.brand}
                            onChange={e => setNewCampaign({ ...newCampaign, brand: e.target.value })}
                          >
                            <option value="">Seleziona un brand...</option>
                            {brands.map(b => (
                              <option key={b.id} value={b.name}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Scadenza (Expiration Date)</label>
                          <input type="date" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newCampaign.deadline} onChange={e => setNewCampaign({ ...newCampaign, deadline: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Prezzo Chiuso (€)</label>
                            <input required type="number" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Budget Totale" value={newCampaign.totalBudget} onChange={e => setNewCampaign({ ...newCampaign, totalBudget: Number(e.target.value) })} />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Split Agency (%)</label>
                            <input type="number" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" value={newCampaign.agencyFeePercent} onChange={e => setNewCampaign({ ...newCampaign, agencyFeePercent: Number(e.target.value) })} />
                          </div>
                        </div>

                        {/* Live Calculation Preview */}
                        <div className="bg-zinc-900/50 rounded-2xl p-4 border border-white/5 grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking opacity-60">Payout Talent (70%)</p>
                            <p className="text-xl font-black text-white">€{calculatedTalentFee.toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking opacity-60">Fee Agenzia (30%)</p>
                            <p className="text-xl font-black text-emerald-500">€{calculatedAgencyFee.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Col: Talent Linking */}
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h4 className="text-xs font-black text-purple-500 uppercase tracking-widest">Collega Talent</h4>
                        <label className="inline-flex items-center cursor-pointer">
                          <input type="checkbox" className="sr-only peer" checked={linkTalent.enabled} onChange={e => setLinkTalent({ ...linkTalent, enabled: e.target.checked })} />
                          <div className="relative w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>

                      <div className={`space-y-4 transition-all ${linkTalent.enabled ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Seleziona Talent</label>
                          <select
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none"
                            value={linkTalent.talentId}
                            onChange={e => setLinkTalent({ ...linkTalent, talentId: e.target.value })}
                            disabled={!linkTalent.enabled}
                          >
                            <option value="">Seleziona un talento...</option>
                            {talents.map(t => <option key={t.id} value={t.id}>{t.stageName}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Tipo Attività</label>
                          <input
                            type="text"
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            value={linkTalent.type}
                            onChange={e => setLinkTalent({ ...linkTalent, type: e.target.value })}
                            disabled={!linkTalent.enabled}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Data Attività (Per il calendario)</label>
                          <input
                            type="date"
                            className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                            value={linkTalent.activityDate}
                            onChange={e => setLinkTalent({ ...linkTalent, activityDate: e.target.value })}
                            disabled={!linkTalent.enabled}
                          />
                        </div>
                        <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                          <p className="text-[10px] font-bold text-purple-300">
                            <CheckCircle2 size={12} className="inline mr-1" />
                            Creerò automaticamente la collaborazione con fee di €{calculatedTalentFee.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-4 border-t border-white/5">
                    <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95">
                      Crea Campagna
                    </button>
                    <button type="button" onClick={() => setShowAddModal(false)} className="px-10 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-black uppercase text-xs tracking-widest py-5 rounded-2xl transition-all">
                      Annulla
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )
        }
      </AnimatePresence>
    </motion.div >
  );
};

export default Campaigns;
