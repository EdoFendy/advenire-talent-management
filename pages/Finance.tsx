
import React, { useState, useMemo } from 'react';
import {
  Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, Plus, Calendar, Filter,
  Download, X, Calculator, Trash2, Copy, FileText, ChevronRight,
  Building2, Briefcase, Camera, Users, MessageSquare, Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isWithinInterval, parseISO, startOfYear, endOfYear } from 'date-fns';
import { it } from 'date-fns/locale';
import { Campaign, Collaboration, ExtraCost, Income, Role, Talent, Quote, QuoteItem } from '../types';
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

// ==================== TEMPLATE DEFINITIONS ====================

const QUOTE_TEMPLATES: Record<string, { label: string; icon: any; items: QuoteItem[] }> = {
  campagna: {
    label: 'Campagna Social',
    icon: Briefcase,
    items: [
      { descrizione: 'Fee talent', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Produzione contenuti', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Gestione campagna', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Strategia e planning', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Report e analytics', quantita: 1, prezzo_unitario: 0, totale: 0 },
    ]
  },
  shooting: {
    label: 'Shooting',
    icon: Camera,
    items: [
      { descrizione: 'Fotografo / Videomaker', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Location', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Trucco e parrucco', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Styling', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Catering', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Post-produzione', quantita: 1, prezzo_unitario: 0, totale: 0 },
    ]
  },
  evento: {
    label: 'Evento',
    icon: Users,
    items: [
      { descrizione: 'Venue / Location', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Catering', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Staff e hostess', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Allestimento', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Audio e luci', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Comunicazione e inviti', quantita: 1, prezzo_unitario: 0, totale: 0 },
    ]
  },
  consulenza: {
    label: 'Consulenza',
    icon: MessageSquare,
    items: [
      { descrizione: 'Ore consulenza', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Analisi e report', quantita: 1, prezzo_unitario: 0, totale: 0 },
      { descrizione: 'Follow-up', quantita: 1, prezzo_unitario: 0, totale: 0 },
    ]
  }
};

// ==================== QUOTE EDITOR COMPONENT ====================

interface QuoteEditorProps {
  quote?: Quote;
  onClose: () => void;
  onSaved?: () => void;
}

const QuoteEditor: React.FC<QuoteEditorProps> = ({ quote, onClose, onSaved }) => {
  const { clients, campaigns, addQuote, updateQuote, showToast } = useApp();

  const [titolo, setTitolo] = useState(quote?.titolo || '');
  const [tipo, setTipo] = useState<Quote['tipo']>(quote?.tipo || 'custom');
  const [clientId, setClientId] = useState(quote?.client_id || '');
  const [campaignId, setCampaignId] = useState(quote?.campaign_id || '');
  const [stato, setStato] = useState<Quote['stato']>(quote?.stato || 'bozza');
  const [note, setNote] = useState(quote?.note || '');
  const [ivaPercent, setIvaPercent] = useState(quote?.iva_percent ?? 22);
  const [items, setItems] = useState<QuoteItem[]>(quote?.items || []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtotale = useMemo(() => items.reduce((sum, item) => sum + item.totale, 0), [items]);
  const ivaAmount = subtotale * (ivaPercent / 100);
  const totale = subtotale + ivaAmount;

  const addItem = () => {
    setItems(prev => [...prev, { descrizione: '', quantita: 1, prezzo_unitario: 0, totale: 0 }]);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantita' || field === 'prezzo_unitario') {
        updated.totale = updated.quantita * updated.prezzo_unitario;
      }
      return updated;
    }));
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const loadTemplate = (templateKey: string) => {
    const template = QUOTE_TEMPLATES[templateKey];
    if (template) {
      setItems(template.items.map(item => ({ ...item })));
      setTipo(templateKey as Quote['tipo']);
    }
  };

  const handleSave = async () => {
    if (!titolo.trim()) {
      showToast('Inserisci un titolo per il preventivo', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      const data = {
        titolo, tipo, client_id: clientId || undefined, campaign_id: campaignId || undefined,
        stato, note: note || undefined, subtotale, iva_percent: ivaPercent, totale, items
      };
      if (quote) {
        await updateQuote(quote.id, data);
      } else {
        await addQuote(data as any);
      }
      onSaved?.();
      onClose();
    } catch (error: any) {
      showToast(error.message || 'Errore durante il salvataggio', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyWhatsApp = () => {
    const client = clientId ? clients.find(c => c.id === clientId) : null;
    let text = `*PREVENTIVO - ${titolo}*\n`;
    if (client) text += `Cliente: ${client.ragione_sociale}\n`;
    text += `Tipo: ${tipo}\n\n`;
    text += `*DETTAGLIO VOCI:*\n`;
    items.forEach(item => {
      if (item.descrizione) {
        text += `- ${item.descrizione}: ${item.quantita} x €${item.prezzo_unitario.toLocaleString()} = €${item.totale.toLocaleString()}\n`;
      }
    });
    text += `\n*Subtotale:* €${subtotale.toLocaleString()}`;
    text += `\n*IVA (${ivaPercent}%):* €${ivaAmount.toLocaleString()}`;
    text += `\n*TOTALE:* €${totale.toLocaleString()}`;
    if (note) text += `\n\nNote: ${note}`;
    navigator.clipboard.writeText(text);
    showToast('Preventivo copiato per WhatsApp', 'success');
  };

  const exportPDF = () => {
    const client = clientId ? clients.find(c => c.id === clientId) : null;
    const printContent = `
      <html>
        <head>
          <title>Preventivo - ${titolo}</title>
          <style>
            body { font-family: 'Helvetica Neue', sans-serif; padding: 50px; color: #111; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #111; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
            .logo-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #666; }
            .meta { text-align: right; font-size: 11px; color: #666; }
            .meta strong { color: #111; }
            h1 { font-size: 22px; text-transform: uppercase; margin: 0 0 5px 0; }
            .tipo-badge { display: inline-block; background: #f0f0f0; padding: 3px 10px; font-size: 10px; text-transform: uppercase; font-weight: bold; letter-spacing: 1px; border-radius: 4px; }
            .client-info { background: #f8f8f8; padding: 15px 20px; border-radius: 8px; margin: 20px 0 30px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { text-align: left; border-bottom: 2px solid #ddd; padding: 8px 5px; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #666; }
            td { border-bottom: 1px solid #eee; padding: 10px 5px; font-size: 13px; }
            td.num { text-align: right; font-weight: bold; }
            .totals { margin-top: 20px; text-align: right; }
            .totals .row { display: flex; justify-content: flex-end; gap: 40px; padding: 6px 0; font-size: 13px; }
            .totals .row.final { border-top: 2px solid #111; padding-top: 12px; margin-top: 8px; font-size: 18px; font-weight: 900; }
            .notes { margin-top: 30px; padding: 15px 20px; background: #f8f8f8; border-radius: 8px; font-size: 12px; color: #444; }
            .footer { margin-top: 50px; text-align: center; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">Advenire</div>
              <div class="logo-sub">Talent Management</div>
            </div>
            <div class="meta">
              <strong>Preventivo</strong><br/>
              Data: ${format(new Date(), 'dd/MM/yyyy')}<br/>
              Stato: ${stato}
            </div>
          </div>

          <h1>${titolo}</h1>
          <span class="tipo-badge">${tipo}</span>

          ${client ? `<div class="client-info"><strong>Cliente:</strong> ${client.ragione_sociale}${client.referente ? ` — Rif. ${client.referente}` : ''}${client.email ? ` — ${client.email}` : ''}</div>` : ''}

          <table>
            <thead>
              <tr><th>Descrizione</th><th style="text-align:right">Qtà</th><th style="text-align:right">Prezzo Unit.</th><th style="text-align:right">Totale</th></tr>
            </thead>
            <tbody>
              ${items.filter(item => item.descrizione).map(item => `
                <tr>
                  <td>${item.descrizione}</td>
                  <td class="num">${item.quantita}</td>
                  <td class="num">€${item.prezzo_unitario.toLocaleString()}</td>
                  <td class="num">€${item.totale.toLocaleString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="row"><span>Subtotale</span><span>€${subtotale.toLocaleString()}</span></div>
            <div class="row"><span>IVA (${ivaPercent}%)</span><span>€${ivaAmount.toLocaleString()}</span></div>
            <div class="row final"><span>TOTALE</span><span>€${totale.toLocaleString()}</span></div>
          </div>

          ${note ? `<div class="notes"><strong>Note:</strong> ${note}</div>` : ''}

          <div class="footer">Advenire Talent Management — Preventivo generato il ${format(new Date(), 'dd/MM/yyyy')}</div>
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
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-4xl shadow-3xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">
              {quote ? 'Modifica Preventivo' : 'Nuovo Preventivo'}
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Preventivatore Advenire</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={copyWhatsApp} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-emerald-400 transition-all" title="Copia per WhatsApp">
              <Copy size={16} />
            </button>
            <button onClick={exportPDF} className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-500 hover:text-blue-400 transition-all" title="Esporta PDF">
              <Download size={16} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Titolo *</label>
              <input
                type="text" required
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                placeholder="es. Preventivo Campagna Estate 2026"
                value={titolo}
                onChange={e => setTitolo(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Cliente</label>
              <select
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none appearance-none"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
              >
                <option value="">Nessun cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Campagna</label>
              <select
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none appearance-none"
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
              >
                <option value="">Nessuna campagna</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Stato</label>
              <select
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none appearance-none"
                value={stato}
                onChange={e => setStato(e.target.value as Quote['stato'])}
              >
                <option value="bozza">Bozza</option>
                <option value="inviato">Inviato</option>
                <option value="accettato">Accettato</option>
                <option value="rifiutato">Rifiutato</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">IVA (%)</label>
              <input
                type="number" min={0} max={100}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                value={ivaPercent}
                onChange={e => setIvaPercent(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Templates */}
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-2">Template Predefiniti</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(QUOTE_TEMPLATES).map(([key, tmpl]) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={key}
                    onClick={() => loadTemplate(key)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${tipo === key
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                      : 'border-white/10 text-zinc-500 hover:text-white hover:border-white/20'
                      }`}
                  >
                    <Icon size={12} />
                    {tmpl.label}
                  </button>
                );
              })}
              <button
                onClick={() => { setTipo('custom'); setItems([]); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${tipo === 'custom'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-white/10 text-zinc-500 hover:text-white hover:border-white/20'
                  }`}
              >
                <Settings size={12} />
                Personalizzato
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Voci del Preventivo</label>
              <button
                onClick={addItem}
                className="flex items-center gap-1 text-[10px] font-black text-blue-400 hover:text-blue-300 uppercase tracking-widest transition-all"
              >
                <Plus size={12} /> Aggiungi Voce
              </button>
            </div>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-1">
                <div className="col-span-5 text-[9px] font-black text-zinc-600 uppercase tracking-widest">Descrizione</div>
                <div className="col-span-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-right">Qtà</div>
                <div className="col-span-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-right">Prezzo Unit.</div>
                <div className="col-span-2 text-[9px] font-black text-zinc-600 uppercase tracking-widest text-right">Totale</div>
                <div className="col-span-1" />
              </div>

              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-zinc-900/30 rounded-xl px-3 py-2 border border-white/5">
                  <div className="col-span-5">
                    <input
                      type="text"
                      className="w-full bg-transparent text-sm text-white font-bold focus:outline-none placeholder-zinc-600"
                      placeholder="Descrizione voce..."
                      value={item.descrizione}
                      onChange={e => updateItem(idx, 'descrizione', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min={1}
                      className="w-full bg-transparent text-sm text-white font-bold focus:outline-none text-right"
                      value={item.quantita}
                      onChange={e => updateItem(idx, 'quantita', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-end">
                      <span className="text-zinc-600 text-xs mr-1">€</span>
                      <input
                        type="number" min={0}
                        className="w-full bg-transparent text-sm text-white font-bold focus:outline-none text-right"
                        value={item.prezzo_unitario || ''}
                        onChange={e => updateItem(idx, 'prezzo_unitario', Number(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="col-span-2 text-right">
                    <span className="text-sm font-black text-white">€{item.totale.toLocaleString()}</span>
                  </div>
                  <div className="col-span-1 text-right">
                    <button onClick={() => removeItem(idx)} className="p-1 text-zinc-600 hover:text-red-400 transition-all">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {items.length === 0 && (
                <div className="text-center py-6 text-zinc-600 text-xs">
                  Nessuna voce. Seleziona un template o aggiungi voci personalizzate.
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-zinc-900/50 border border-white/5 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400">Subtotale</span>
              <span className="text-lg font-black text-white">€{subtotale.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-zinc-400">IVA ({ivaPercent}%)</span>
              <span className="text-sm font-bold text-zinc-400">€{ivaAmount.toLocaleString()}</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Totale</span>
              <span className="text-2xl font-black text-white">€{totale.toLocaleString()}</span>
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Note</label>
            <textarea
              rows={2}
              className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none resize-none"
              placeholder="Note aggiuntive..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex gap-3 shrink-0">
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            {isSubmitting ? 'Salvataggio...' : (quote ? 'Salva Modifiche' : 'Crea Preventivo')}
          </button>
          <button onClick={onClose} className="px-6 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all">
            Annulla
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ==================== QUOTES LIST COMPONENT ====================

const QuotesList: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { quotes, clients, deleteQuote } = useApp();
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [filterStato, setFilterStato] = useState<string>('ALL');

  const filteredQuotes = useMemo(() => {
    if (filterStato === 'ALL') return quotes;
    return quotes.filter(q => q.stato === filterStato);
  }, [quotes, filterStato]);

  const handleDelete = async (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questo preventivo?')) {
      await deleteQuote(id);
    }
  };

  const getStatoColor = (stato: string) => {
    switch (stato) {
      case 'bozza': return 'bg-zinc-700/50 text-zinc-300';
      case 'inviato': return 'bg-blue-500/20 text-blue-400';
      case 'accettato': return 'bg-emerald-500/20 text-emerald-400';
      case 'rifiutato': return 'bg-red-500/20 text-red-400';
      default: return 'bg-zinc-700/50 text-zinc-300';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-3xl shadow-3xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Preventivi</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">
              {quotes.length} preventiv{quotes.length === 1 ? 'o' : 'i'} totali
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewQuote(true)}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Plus size={14} /> Nuovo
            </button>
            <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {['ALL', 'bozza', 'inviato', 'accettato', 'rifiutato'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStato(s)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${filterStato === s ? 'bg-blue-600 text-white' : 'text-zinc-500 hover:text-white bg-zinc-900/50'}`}
            >
              {s === 'ALL' ? 'Tutti' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredQuotes.map(q => {
            const client = q.client_id ? clients.find(c => c.id === q.client_id) : null;
            return (
              <div
                key={q.id}
                className="bg-zinc-900/30 border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all cursor-pointer group"
                onClick={() => setEditingQuote(q)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getStatoColor(q.stato)}`}>
                        {q.stato}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[8px] font-black text-zinc-400 uppercase tracking-widest">
                        {q.tipo}
                      </span>
                    </div>
                    <p className="text-sm font-black text-white group-hover:text-blue-400 transition-colors truncate">{q.titolo}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {client && <span className="text-[10px] text-zinc-500 font-bold">{client.ragione_sociale}</span>}
                      {q.createdAt && (
                        <span className="text-[10px] text-zinc-600 font-bold">
                          {format(new Date(q.createdAt), 'dd MMM yyyy', { locale: it })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black text-white">€{q.totale.toLocaleString()}</p>
                      <p className="text-[10px] text-zinc-600 font-bold">{q.items.length} voci</p>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(q.id); }}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-zinc-600 hover:text-red-400 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredQuotes.length === 0 && (
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-zinc-800 mb-3" />
              <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">Nessun preventivo</p>
              <p className="text-[10px] text-zinc-700 mt-2">Crea il tuo primo preventivo</p>
            </div>
          )}
        </div>

        {/* Sub-modals */}
        <AnimatePresence>
          {showNewQuote && <QuoteEditor onClose={() => setShowNewQuote(false)} />}
          {editingQuote && <QuoteEditor quote={editingQuote} onClose={() => setEditingQuote(null)} />}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ==================== MAIN FINANCE PAGE ====================

const Finance: React.FC<FinanceProps> = ({ campaigns, collaborations, extraCosts, income, role, talentId, talents }) => {
  const { addIncome, addExtraCost, deleteIncome, deleteExtraCost } = useApp();
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState({
    start: format(startOfYear(new Date()), 'yyyy-MM-dd'),
    end: format(endOfYear(new Date()), 'yyyy-MM-dd')
  });

  const [showCostModal, setShowCostModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showQuotesList, setShowQuotesList] = useState(false);

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
    );

    const filteredCollabs = (selectedCampaignId === 'ALL'
      ? collaborations
      : collaborations.filter(c => c.campaignId === selectedCampaignId)
    );

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

    const totalRevenue = filteredCampaigns.reduce((acc, c) => acc + c.totalBudget, 0);
    const totalTalentPayouts = filteredCollabs.reduce((acc, c) => acc + c.fee, 0);
    const totalExtraCosts = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
    const grossProfit = totalRevenue - totalTalentPayouts - totalExtraCosts;
    const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const cashIn = filteredIncome.filter(i => i.status === 'received').reduce((acc, i) => acc + i.amount, 0);
    const cashPending = filteredIncome.filter(i => i.status === 'pending').reduce((acc, i) => acc + i.amount, 0);
    const cashOut = filteredCollabs.filter(c => c.paymentStatus === 'Saldato').reduce((acc, c) => acc + c.fee, 0) +
      filteredCosts.filter(c => c.status === 'paid').reduce((acc, c) => acc + c.amount, 0);

    return {
      totalRevenue, totalTalentPayouts, totalExtraCosts, grossProfit, margin,
      cashIn, cashPending, cashOut, filteredCampaigns, filteredCosts, filteredIncome
    };
  }, [campaigns, collaborations, extraCosts, income, selectedCampaignId, dateRange]);

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

        <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Storico Pagamenti</h3>
          </div>
          <div className="divide-y divide-white/5">
            {talentFinance.myCollabs.map(col => {
              const campaign = campaigns.find(c => c.id === col.campaignId);
              return (
                <div key={col.id} className="p-5 flex items-center justify-between hover:bg-zinc-900/20 transition-all">
                  <div>
                    <h4 className="text-sm font-black text-white">{col.brand}</h4>
                    <p className="text-[10px] font-bold text-zinc-500">{campaign?.name} • {col.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-white">€{col.fee.toLocaleString()}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${col.paymentStatus === 'Saldato' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
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
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Finanze</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            Analisi profittabilità e flussi di cassa
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowQuotesList(true)}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-blue-500/50 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
          >
            <Calculator size={14} className="text-blue-500" />
            Preventivatore
          </button>
          <button
            onClick={() => setShowIncomeModal(true)}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-emerald-500/50 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
          >
            <Plus size={14} className="text-emerald-500" />
            Reg. Incasso
          </button>
          <button
            onClick={() => setShowCostModal(true)}
            className="flex items-center gap-2 bg-zinc-900 border border-white/10 hover:border-red-500/50 hover:bg-zinc-800 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
          >
            <Plus size={14} className="text-red-500" />
            Reg. Costo
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Fatturato</p>
          <p className="text-2xl font-black text-white">€{analytics.totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-emerald-500 font-bold mt-1">€{analytics.cashIn.toLocaleString()} incassati</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Payout Talent</p>
          <p className="text-2xl font-black text-blue-400">€{analytics.totalTalentPayouts.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-600 font-bold mt-1">{analytics.totalRevenue > 0 ? ((analytics.totalTalentPayouts / analytics.totalRevenue) * 100).toFixed(0) : 0}% del fatturato</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Costi Extra</p>
          <p className="text-2xl font-black text-red-400">€{analytics.totalExtraCosts.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-600 font-bold mt-1">Produzione, logistica, ads</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-emerald-500/20">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Utile Netto</p>
          <p className="text-2xl font-black text-white">€{analytics.grossProfit.toLocaleString()}</p>
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${Math.min(analytics.margin, 100)}%` }} />
            </div>
            <span className="text-[10px] font-black text-emerald-500">{analytics.margin.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-zinc-900/40 p-2 rounded-xl border border-white/5 w-fit">
        <div className="flex items-center px-3 py-1.5 border-r border-white/5">
          <Filter size={14} className="text-zinc-500 mr-2" />
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Filtra</span>
        </div>
        <select
          value={selectedCampaignId}
          onChange={(e) => setSelectedCampaignId(e.target.value)}
          className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 cursor-pointer outline-none min-w-[180px]"
        >
          <option value="ALL" className="bg-zinc-900">Tutte le Campagne</option>
          {campaigns.map(c => <option key={c.id} value={c.id} className="bg-zinc-900">{c.name}</option>)}
        </select>
        <div className="flex items-center gap-2 pl-3 border-l border-white/5">
          <Calendar size={14} className="text-zinc-500" />
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 w-[110px]" />
          <span className="text-zinc-600">-</span>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent border-none text-xs font-bold text-white focus:ring-0 w-[110px]" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entrate */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ArrowUpRight size={16} className="text-emerald-500" /> Flusso Entrate
            </h3>
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {analytics.filteredIncome.length > 0 ? analytics.filteredIncome.map(inc => {
              const camp = campaigns.find(c => c.id === inc.campaignId);
              return (
                <div key={inc.id} className="p-4 border-b border-white/5 hover:bg-zinc-900/30 transition-all flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-black text-white">{camp?.name}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{format(new Date(inc.date), 'dd MMM yyyy', { locale: it })} • {inc.note || 'Nessuna nota'}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm font-black text-white">€{inc.amount.toLocaleString()}</p>
                      <span className={`text-[9px] font-black uppercase ${inc.status === 'received' ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {inc.status === 'received' ? 'Incassato' : 'In Attesa'}
                      </span>
                    </div>
                    <button onClick={() => deleteIncome(inc.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-zinc-600"><X size={12} /></button>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">Nessun movimento</div>
            )}
          </div>
        </div>

        {/* Uscite */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
              <ArrowDownRight size={16} className="text-red-500" /> Costi Extra
            </h3>
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {analytics.filteredCosts.length > 0 ? analytics.filteredCosts.map(cost => {
              const camp = campaigns.find(c => c.id === cost.campaignId);
              return (
                <div key={cost.id} className="p-4 border-b border-white/5 hover:bg-zinc-900/30 transition-all flex items-center justify-between group">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[8px] font-black text-zinc-400 uppercase">{cost.category}</span>
                      <span className="text-xs font-black text-white">{camp?.name}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{cost.provider} • {format(new Date(cost.date), 'dd MMM', { locale: it })}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm font-black text-white">€{cost.amount.toLocaleString()}</p>
                      <span className={`text-[9px] font-black uppercase ${cost.status === 'paid' ? 'text-blue-500' : 'text-zinc-500'}`}>
                        {cost.status === 'paid' ? 'Pagato' : 'Da Pagare'}
                      </span>
                    </div>
                    <button onClick={() => deleteExtraCost(cost.id)} className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all text-zinc-600"><X size={12} /></button>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-zinc-600 text-xs font-bold uppercase tracking-widest">Nessun costo extra</div>
            )}
          </div>
        </div>
      </div>

      {/* Quotes List Modal */}
      <AnimatePresence>
        {showQuotesList && <QuotesList onClose={() => setShowQuotesList(false)} />}
      </AnimatePresence>

      {/* Add Cost Modal */}
      <AnimatePresence>
        {showCostModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCostModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-lg shadow-3xl overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Nuovo Costo</h3>
                <button onClick={() => setShowCostModal(false)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddCost} className="space-y-4">
                <select className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newCost.campaignId} onChange={e => setNewCost({ ...newCost, campaignId: e.target.value })}>
                  <option value="">Seleziona Campagna...</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-4">
                  <select className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newCost.category} onChange={e => setNewCost({ ...newCost, category: e.target.value })}>
                    <option value="videomaker">Videomaker</option>
                    <option value="luci">Luci & Service</option>
                    <option value="van">Trasporti / Van</option>
                    <option value="ads">Advertising</option>
                    <option value="location">Location</option>
                    <option value="altro">Altro</option>
                  </select>
                  <input type="number" placeholder="Importo €" className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newCost.amount || ''} onChange={e => setNewCost({ ...newCost, amount: Number(e.target.value) })} />
                </div>
                <input type="text" placeholder="Fornitore (opzionale)" className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newCost.provider} onChange={e => setNewCost({ ...newCost, provider: e.target.value })} />
                <input type="date" className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newCost.date} onChange={e => setNewCost({ ...newCost, date: e.target.value })} />
                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-red-500/20 mt-2">Registra Costo</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Income Modal */}
      <AnimatePresence>
        {showIncomeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowIncomeModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-lg shadow-3xl overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-white uppercase tracking-tight">Nuovo Incasso</h3>
                <button onClick={() => setShowIncomeModal(false)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white"><X size={18} /></button>
              </div>
              <form onSubmit={handleAddIncome} className="space-y-4">
                <select className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newIncome.campaignId} onChange={e => setNewIncome({ ...newIncome, campaignId: e.target.value })}>
                  <option value="">Seleziona Campagna...</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <input type="number" placeholder="Importo €" className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newIncome.amount || ''} onChange={e => setNewIncome({ ...newIncome, amount: Number(e.target.value) })} />
                <input type="date" className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newIncome.date} onChange={e => setNewIncome({ ...newIncome, date: e.target.value })} />
                <input type="text" placeholder="Note (Fattura N., Bonifico...)" className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none" value={newIncome.notes} onChange={e => setNewIncome({ ...newIncome, notes: e.target.value })} />
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20 mt-2">Registra Incasso</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Finance;
