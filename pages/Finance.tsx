
import React, { useState, useMemo } from 'react';
import {
  Wallet, TrendingUp, TrendingDown, DollarSign, PieChart,
  ArrowUpRight, ArrowDownRight, Plus, Calendar, Filter,
  MoreHorizontal, Download, ChevronRight, X, AlertCircle, FileText, Calculator
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { Campaign, Collaboration, ExtraCost, Income, Role, Talent } from '../types';
import { useApp } from '../context/AppContext';

interface FinanceProps {
  campaigns: Campaign[];
  collaborations: Collaboration[];
  extraCosts: ExtraCost[];
  income: Income[];
  role: Role;
  talentId?: string;
  talents: Talent[];
}

const formatFollowers = (count: number) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

const Finance: React.FC<FinanceProps> = ({ campaigns, collaborations, extraCosts, income, role, talentId, talents }) => {
  const { addIncome, addExtraCost, deleteIncome, deleteExtraCost } = useApp();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState({
    start: format(startOfYear(new Date()), 'yyyy-MM-dd'),
    end: format(endOfYear(new Date()), 'yyyy-MM-dd')
  });

  const [showCostModal, setShowCostModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showQuoteModal, setShowQuoteModal] = useState(false); // New Quote Calculator

  // Quote Generator State
  const [quoteForm, setQuoteForm] = useState({
    minFollowers: 0,
    contentsPerTalent: 1,
    feePerContent: 0, // Simplified avg fee
    selectedTalents: [] as string[]
  });

  // Form States
  const [newCost, setNewCost] = useState({
    campaignId: '',
    category: 'videomaker',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    provider: '',
    notes: ''
  });

  const [newIncome, setNewIncome] = useState({
    campaignId: '',
    amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    expectedDate: '',
    notes: ''
  });

  // Derived Data
  const analytics = useMemo(() => {
    // Filter by campaign if selected
    const checkDate = (dateStr: string) => {
      try {
        return isWithinInterval(parseISO(dateStr), {
          start: parseISO(dateRange.start),
          end: parseISO(dateRange.end)
        });
      } catch { return true; }
    };

    const filteredCampaigns = (selectedCampaignId === 'ALL'
      ? campaigns
      : campaigns.filter(c => c.id === selectedCampaignId)
    ); // Campaigns often span ranges, so straightforward filtering might be loose. We filter transactions mostly.

    const filteredCollabs = (selectedCampaignId === 'ALL'
      ? collaborations
      : collaborations.filter(c => c.campaignId === selectedCampaignId)
    ); // Collabs usually attached to campaigns

    const filteredCosts = extraCosts.filter(c => {
      const matchCamp = selectedCampaignId === 'ALL' || c.campaignId === selectedCampaignId;
      const matchDate = checkDate(c.date);
      return matchCamp && matchDate;
    });

    const filteredIncome = income.filter(i => {
      const matchCamp = selectedCampaignId === 'ALL' || i.campaignId === selectedCampaignId;
      const matchDate = checkDate(i.date);
      return matchCamp && matchDate;
    });

    // Totals
    const totalRevenue = filteredCampaigns.reduce((acc, c) => acc + c.totalBudget, 0); // Fatturato teorico da contratto
    const totalTalentPayouts = filteredCollabs.reduce((acc, c) => acc + c.fee, 0);
    const totalExtraCosts = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
    const grossProfit = totalRevenue - totalTalentPayouts - totalExtraCosts;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // Cash Flow (Real Money)
    const cashIn = filteredIncome.filter(i => i.status === 'received').reduce((acc, i) => acc + i.amount, 0);
    const cashPending = filteredIncome.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.amount, 0);
    const cashOut = filteredCollabs.filter(c => c.paymentStatus === 'Saldato').reduce((acc, c) => acc + c.fee, 0) +
      filteredCosts.filter(c => c.status === 'paid').reduce((acc, c) => acc + c.amount, 0);

    return {
      totalRevenue,
      totalTalentPayouts,
      totalExtraCosts,
      grossProfit,
      margin,
      cashIn,
      cashPending,
      cashOut,
      filteredCampaigns,
      filteredCosts,
      filteredIncome
    };
  }, [campaigns, collaborations, extraCosts, income, selectedCampaignId, dateRange]);

  // Derived Quote Data
  const quoteStats = useMemo(() => {
    const validTalents = talents.filter(t => t.status === 'active' && (
      (t.instagramFollowers || 0) + (t.tiktokFollowers || 0) >= quoteForm.minFollowers
    ));

    const selected = validTalents.filter(t => quoteForm.selectedTalents.includes(t.id));

    const totalFollowers = selected.reduce((acc, t) => acc + (t.instagramFollowers || 0) + (t.tiktokFollowers || 0), 0);
    const totalContents = selected.length * quoteForm.contentsPerTalent;
    const estimatedTotal = totalContents * quoteForm.feePerContent;

    return { validTalents, selected, totalFollowers, totalContents, estimatedTotal };
  }, [talents, quoteForm]);

  const toggleTalentSelection = (id: string) => {
    setQuoteForm(prev => ({
      ...prev,
      selectedTalents: prev.selectedTalents.includes(id)
        ? prev.selectedTalents.filter(tid => tid !== id)
        : [...prev.selectedTalents, id]
    }));
  };

  const selectAllValidTalents = () => {
    setQuoteForm(prev => ({
      ...prev,
      selectedTalents: quoteStats.validTalents.map(t => t.id)
    }));
  };

  // Talent View Data
  const talentFinance = useMemo(() => {
    if (role !== 'talent' || !talentId) return null;

    const myCollabs = collaborations.filter(c => c.talentId === talentId);
    const totalEarned = myCollabs.reduce((acc, c) => acc + c.fee, 0);
    const paid = myCollabs.filter(c => c.paymentStatus === 'Saldato').reduce((acc, c) => acc + c.fee, 0);
    const pending = totalEarned - paid;

    return { myCollabs, totalEarned, paid, pending };
  }, [collaborations, role, talentId]);

  // Handlers
  const handleAddCost = async (e: React.FormEvent) => {
    e.preventDefault();
    await addExtraCost({
      campaignId: newCost.campaignId || campaigns[0]?.id,
      category: newCost.category as any,
      amount: newCost.amount,
      date: newCost.date,
      provider: newCost.provider,
      status: 'unpaid',
      note: newCost.notes
    });
    setShowCostModal(false);
    setNewCost({ campaignId: '', category: 'videomaker', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), provider: '', notes: '' });
  };

  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    await addIncome({
      campaignId: newIncome.campaignId || campaigns[0]?.id,
      amount: newIncome.amount,
      status: 'pending',
      date: newIncome.date,
      expectedDate: newIncome.expectedDate,
      note: newIncome.notes
    });
    setShowIncomeModal(false);
    setNewIncome({ campaignId: '', amount: 0, date: format(new Date(), 'yyyy-MM-dd'), expectedDate: '', notes: '' });
  };

  if (role === 'talent' && talentFinance) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">I Miei Guadagni</h1>
          <p className="text-zinc-500 font-medium text-lg">Riepilogo finanziario e stato pagamenti.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Totale Maturato</p>
            <p className="text-4xl font-black text-white">€{talentFinance.totalEarned.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Incassato</p>
            <p className="text-4xl font-black text-emerald-500">€{talentFinance.paid.toLocaleString()}</p>
          </div>
          <div className="bg-zinc-900/30 rounded-2xl p-6 border border-white/5">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">In Attesa</p>
            <p className="text-4xl font-black text-amber-500">€{talentFinance.pending.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="px-8 py-6 border-b border-white/5">
            <h3 className="text-lg font-black text-white uppercase">Storico Pagamenti</h3>
          </div>
          <div className="divide-y divide-white/5">
            {talentFinance.myCollabs.map(col => {
              const campaign = campaigns.find(c => c.id === col.campaignId);
              return (
                <div key={col.id} className="p-6 flex items-center justify-between hover:bg-zinc-900/20 transition-all">
                  <div>
                    <h4 className="text-xl font-black text-white uppercase">{col.brand}</h4>
                    <p className="text-sm font-bold text-zinc-500">{campaign?.name} • {col.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-black text-white">€{col.fee.toLocaleString()}</p>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${col.paymentStatus === 'Saldato' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                      }`}>
                      {col.paymentStatus}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Admin View
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Finance & Controllo</h1>
          <p className="text-zinc-500 font-medium text-lg">Analisi profittabilità e flussi di cassa.</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowQuoteModal(true)}
            className="flex items-center space-x-3 bg-zinc-900 border border-white/10 hover:border-blue-500/50 hover:bg-zinc-800 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
          >
            <Calculator size={16} className="text-blue-500" />
            <span>Preventivatore</span>
          </button>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="flex items-center space-x-3 bg-zinc-900 border border-white/10 hover:border-emerald-500/50 hover:bg-zinc-800 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
          >
            <Plus size={16} className="text-emerald-500" />
            <span>Reg. Incasso</span>
          </button>
          <button
            onClick={() => setShowCostModal(true)}
            className="flex items-center space-x-3 bg-zinc-900 border border-white/10 hover:border-red-500/50 hover:bg-zinc-800 text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
          >
            <Plus size={16} className="text-red-500" />
            <span>Reg. Costo</span>
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-zinc-900 to-black rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={80} />
          </div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Fatturato Contrattualizzato</p>
          <p className="text-4xl font-black text-white tracking-tight">€{analytics.totalRevenue.toLocaleString()}</p>
          <div className="mt-4 flex items-center space-x-2 text-[10px] font-bold text-zinc-400">
            <span className="text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded flex items-center">
              <ArrowUpRight size={12} className="mr-1" /> Incassi
            </span>
            <span>€{analytics.cashIn.toLocaleString()} reali</span>
          </div>
        </div>

        <div className="bg-[#0c0c0c] rounded-[2rem] p-6 border border-white/5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Payout Talent</p>
          <p className="text-4xl font-black text-blue-500 tracking-tight">€{analytics.totalTalentPayouts.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-zinc-600 mt-2">Circa il {analytics.totalRevenue > 0 ? ((analytics.totalTalentPayouts / analytics.totalRevenue) * 100).toFixed(0) : 0}% del fatturato</p>
        </div>

        <div className="bg-[#0c0c0c] rounded-[2rem] p-6 border border-white/5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Costi Extra</p>
          <p className="text-4xl font-black text-red-500 tracking-tight">€{analytics.totalExtraCosts.toLocaleString()}</p>
          <p className="text-[10px] font-bold text-zinc-600 mt-2">Produzione, logistica, ads</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-900/20 to-black rounded-[2rem] p-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Utile Netto (EBITDA)</p>
          <p className="text-4xl font-black text-white tracking-tight">€{analytics.grossProfit.toLocaleString()}</p>
          <div className="mt-4 flex items-center space-x-2">
            <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(analytics.margin, 100)}%` }} />
            </div>
            <span className="text-xs font-black text-emerald-500">{analytics.margin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Filter Bar w/ Date Range */}
      <div className="flex flex-wrap items-center gap-4 bg-zinc-900/40 p-2 rounded-2xl border border-white/5 w-fit">
        <div className="flex items-center px-4 py-2 border-r border-white/5">
          <Filter size={14} className="text-zinc-500 mr-2" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Filtra Vista</span>
        </div>
        <select
          value={selectedCampaignId}
          onChange={(e) => setSelectedCampaignId(e.target.value)}
          className="bg-transparent border-none text-xs font-bold text-white uppercase focus:ring-0 cursor-pointer outline-none min-w-[200px]"
        >
          <option value="ALL" className="bg-zinc-900">Tutte le Campagne</option>
          {campaigns.map(c => <option key={c.id} value={c.id} className="bg-zinc-900">{c.name} ({c.brand})</option>)}
        </select>
        <div className="flex items-center space-x-2 pl-4 border-l border-white/5">
          <Calendar size={14} className="text-zinc-500" />
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
            className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 w-[110px]"
          />
          <span className="text-zinc-600">-</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
            className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 w-[110px]"
          />
        </div>
      </div >

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Entrate Recent (Cash In) */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center">
              <ArrowUpRight className="text-emerald-500 mr-3" /> Flusso Entrate
            </h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {analytics.filteredIncome.length > 0 ? analytics.filteredIncome.map(inc => {
              const camp = campaigns.find(c => c.id === inc.campaignId);
              return (
                <div key={inc.id} className="p-6 border-b border-white/5 hover:bg-zinc-900/30 transition-all flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-black text-white uppercase">{camp?.name}</p>
                    <p className="text-[10px] text-zinc-500 uppercase mt-1">{format(new Date(inc.date), 'dd MMM yyyy', { locale: it })} • {inc.note || 'Nessuna nota'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">€{inc.amount.toLocaleString()}</p>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <span className={`text-[9px] font-black uppercase ${inc.status === 'received' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {inc.status === 'received' ? 'Incassato' : 'In Attesa'}
                      </span>
                      <button onClick={() => deleteIncome(inc.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"><X size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-10 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">Nessun movimento registrato</div>
            )}
          </div>
        </div>

        {/* Uscite Extra (Cash Out) */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden">
          <div className="p-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center">
              <ArrowDownRight className="text-red-500 mr-3" /> Costi Extra Operativi
            </h3>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            {analytics.filteredCosts.length > 0 ? analytics.filteredCosts.map(cost => {
              const camp = campaigns.find(c => c.id === cost.campaignId);
              return (
                <div key={cost.id} className="p-6 border-b border-white/5 hover:bg-zinc-900/30 transition-all flex items-center justify-between group">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[9px] font-black text-zinc-400 uppercase">{cost.category}</span>
                      <span className="text-xs font-black text-white uppercase">{camp?.name}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase mt-1">{cost.provider} • {format(new Date(cost.date), 'dd MMM', { locale: it })}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-white">€{cost.amount.toLocaleString()}</p>
                    <div className="flex items-center justify-end space-x-2 mt-1">
                      <span className={`text-[9px] font-black uppercase ${cost.status === 'paid' ? 'text-blue-500' : 'text-zinc-500'}`}>
                        {cost.status === 'paid' ? 'Pagato' : 'Da Pagare'}
                      </span>
                      <button onClick={() => deleteExtraCost(cost.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"><X size={12} /></button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="p-10 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">Nessun costo extra</div>
            )}
          </div>
        </div>
      </div>

      {/* Quote Generator Modal */}
      <AnimatePresence>
        {showQuoteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowQuoteModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] w-full max-w-4xl shadow-3xl overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-10 border-b border-white/5 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Preventivatore</h3>
                  <p className="text-zinc-500 font-bold text-sm mt-1">Crea stime basate su follower e contenuti</p>
                </div>
                <button onClick={() => setShowQuoteModal(false)} className="p-3 hover:bg-zinc-900 rounded-2xl transition-all text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Configuration */}
                <div className="space-y-8">
                  <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 space-y-6">
                    <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest">Parametri Campagna</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">Min Follower Totali (IG + TK)</label>
                        <input
                          type="number"
                          value={quoteForm.minFollowers}
                          onChange={e => setQuoteForm(prev => ({ ...prev, minFollowers: parseInt(e.target.value) || 0 }))}
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">Contenuti x Talent</label>
                          <input
                            type="number"
                            value={quoteForm.contentsPerTalent}
                            onChange={e => setQuoteForm(prev => ({ ...prev, contentsPerTalent: parseInt(e.target.value) || 1 }))}
                            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest pl-1 mb-2 block">Costo Medio / Cont.</label>
                          <input
                            type="number"
                            value={quoteForm.feePerContent}
                            onChange={e => setQuoteForm(prev => ({ ...prev, feePerContent: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            placeholder="€"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-900/30 p-6 rounded-3xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest">Talent Selezionabili ({quoteStats.validTalents.length})</h4>
                      <button onClick={selectAllValidTalents} className="text-[10px] uppercase font-bold text-zinc-500 hover:text-white">Seleziona Tutti</button>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {quoteStats.validTalents.length > 0 ? quoteStats.validTalents.map(t => (
                        <div key={t.id} onClick={() => toggleTalentSelection(t.id)} className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${quoteForm.selectedTalents.includes(t.id) ? 'bg-blue-600/20 border-blue-500/50' : 'bg-black border-white/5 hover:bg-zinc-900'
                          }`}>
                          <div>
                            <p className={`text-sm font-bold ${quoteForm.selectedTalents.includes(t.id) ? 'text-white' : 'text-zinc-400'}`}>{t.stageName}</p>
                            <p className="text-[10px] text-zinc-600 uppercase mt-0.5">
                              IG: {formatFollowers(t.instagramFollowers || 0)} • TK: {formatFollowers(t.tiktokFollowers || 0)}
                            </p>
                          </div>
                          {quoteForm.selectedTalents.includes(t.id) && <div className="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />}
                        </div>
                      )) : (
                        <p className="text-center text-zinc-600 text-xs py-10 font-bold uppercase">Nessun talent con min. {quoteForm.minFollowers} follower</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Results Preview */}
                <div className="bg-gradient-to-br from-[#111] to-black p-8 rounded-[2.5rem] border border-white/10 flex flex-col justify-between h-full">
                  <div>
                    <h4 className="text-sm font-black text-zinc-400 uppercase tracking-[0.2em] mb-8">Riepilogo Preventivo</h4>

                    <div className="space-y-6">
                      <div className="flex justify-between items-end border-b border-white/5 pb-4">
                        <span className="text-zinc-500 font-bold text-sm">Talent Selezionati</span>
                        <span className="text-2xl font-black text-white">{quoteStats.selected.length}</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/5 pb-4">
                        <span className="text-zinc-500 font-bold text-sm">Contenuti Totali</span>
                        <span className="text-2xl font-black text-white">{quoteStats.totalContents}</span>
                      </div>
                      <div className="flex justify-between items-end border-b border-white/5 pb-4">
                        <span className="text-zinc-500 font-bold text-sm">Reach Stimata (Followers)</span>
                        <span className="text-2xl font-black text-amber-500">{formatFollowers(quoteStats.totalFollowers)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-white/10">
                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Totale Preventivato</p>
                    <p className="text-6xl font-black text-white tracking-tighter">€{quoteStats.estimatedTotal.toLocaleString()}</p>
                    <div className="flex items-center justify-between mt-6">
                      <p className="text-zinc-500 text-xs font-medium">Esclusa Agency Fee (se non calcolata).</p>
                      <button
                        onClick={() => {
                          const printContent = `
                                  <html>
                                    <head>
                                      <title>Preventivo Campagna - Advenire</title>
                                      <style>
                                        body { font-family: sans-serif; padding: 40px; color: #000; }
                                        h1 { font-size: 24px; text-transform: uppercase; margin-bottom: 10px; }
                                        h2 { font-size: 16px; color: #555; text-transform: uppercase; margin-bottom: 30px; border-bottom: 2px solid #000; padding-bottom: 10px; }
                                        .section { margin-bottom: 20px; }
                                        .label { font-size: 10px; text-transform: uppercase; color: #666; font-weight: bold; }
                                        .value { font-size: 18px; font-weight: bold; }
                                        .total { font-size: 32px; font-weight: 900; margin-top: 10px; }
                                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                                        th { text-align: left; border-bottom: 1px solid #ccc; padding: 5px; text-transform: uppercase; }
                                        td { border-bottom: 1px solid #eee; padding: 5px; }
                                      </style>
                                    </head>
                                    <body>
                                      <h1>Preventivo Campagna</h1>
                                      <h2>Advenire Talent Management</h2>
                                      
                                      <div class="section">
                                        <div class="label">Reach Totale Stimata</div>
                                        <div class="value">${formatFollowers(quoteStats.totalFollowers)}</div>
                                      </div>
                                      
                                      <div class="section">
                                        <div class="label">Numero Contenuti</div>
                                        <div class="value">${quoteStats.totalContents} (${quoteForm.contentsPerTalent} per talent)</div>
                                      </div>

                                      <div class="section">
                                        <div class="label">Budget Totale Stimato</div>
                                        <div class="total">€${quoteStats.estimatedTotal.toLocaleString()}</div>
                                      </div>

                                      <h3>Dettaglio Talent Selezionati</h3>
                                      <table>
                                        <thead>
                                          <tr>
                                            <th>Talent</th>
                                            <th>Follower IG</th>
                                            <th>Follower TK</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          ${quoteStats.selected.map(t => `
                                            <tr>
                                              <td>${t.stageName}</td>
                                              <td>${t.instagramFollowers ? formatFollowers(t.instagramFollowers) : '-'}</td>
                                              <td>${t.tiktokFollowers ? formatFollowers(t.tiktokFollowers) : '-'}</td>
                                            </tr>
                                          `).join('')}
                                        </tbody>
                                      </table>
                                    </body>
                                  </html>
                                `;
                          const printWindow = window.open('', '', 'width=800,height=600');
                          if (printWindow) {
                            printWindow.document.write(printContent);
                            printWindow.document.close();
                            printWindow.focus();
                            printWindow.print();
                            printWindow.close();
                          }
                        }}
                        className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center space-x-2"
                      >
                        <Download size={14} />
                        <span>Scarica PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Cost Modal */}
      <AnimatePresence>
        {showCostModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCostModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-3xl overflow-hidden p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Nuovo Costo</h3>
                <button onClick={() => setShowCostModal(false)} className="p-3 hover:bg-zinc-900 rounded-2xl transition-all text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddCost} className="space-y-4">
                <select className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newCost.campaignId} onChange={e => setNewCost({ ...newCost, campaignId: e.target.value })}>
                  <option value="">Seleziona Campagna...</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newCost.category} onChange={e => setNewCost({ ...newCost, category: e.target.value })}>
                    <option value="videomaker">Videomaker</option>
                    <option value="luci">Luci & Service</option>
                    <option value="van">Trasporti / Van</option>
                    <option value="ads">Advertising</option>
                    <option value="location">Location</option>
                    <option value="altro">Altro</option>
                  </select>
                  <input type="number" placeholder="Importo €" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newCost.amount} onChange={e => setNewCost({ ...newCost, amount: Number(e.target.value) })} />
                </div>
                <input type="text" placeholder="Fornitore (opzionale)" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newCost.provider} onChange={e => setNewCost({ ...newCost, provider: e.target.value })} />
                <input type="date" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newCost.date} onChange={e => setNewCost({ ...newCost, date: e.target.value })} />
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-red-500/20 active:scale-95 mt-4">Registra Costo</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Income Modal */}
      <AnimatePresence>
        {showIncomeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowIncomeModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-3xl overflow-hidden p-10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Nuovo Incasso</h3>
                <button onClick={() => setShowIncomeModal(false)} className="p-3 hover:bg-zinc-900 rounded-2xl transition-all text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddIncome} className="space-y-4">
                <select className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newIncome.campaignId} onChange={e => setNewIncome({ ...newIncome, campaignId: e.target.value })}>
                  <option value="">Seleziona Campagna...</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" placeholder="Importo Incassato €" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newIncome.amount} onChange={e => setNewIncome({ ...newIncome, amount: Number(e.target.value) })} />
                <input type="date" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newIncome.date} onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} />
                <input type="text" placeholder="Note (Fattura N., Bonifico...)" className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-5 py-4 text-white font-bold focus:outline-none" value={newIncome.notes} onChange={e => setNewIncome({ ...newIncome, notes: e.target.value })} />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-emerald-500/20 active:scale-95 mt-4">Registra Incasso</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div >
  );
};

export default Finance;
