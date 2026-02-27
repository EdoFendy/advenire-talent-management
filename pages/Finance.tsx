
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

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/ui/page-header';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { StatCard } from '@/components/ui/stat-card';
import { staggerContainer, staggerItem } from '@/lib/animations';

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
      { descrizione: 'Fee talent', link_social: '', quantita: 1 },
      { descrizione: 'Produzione contenuti', link_social: '', quantita: 1 },
      { descrizione: 'Gestione campagna', link_social: '', quantita: 1 },
      { descrizione: 'Strategia e planning', link_social: '', quantita: 1 },
      { descrizione: 'Report e analytics', link_social: '', quantita: 1 },
    ]
  },
  shooting: {
    label: 'Shooting',
    icon: Camera,
    items: [
      { descrizione: 'Fotografo / Videomaker', link_social: '', quantita: 1 },
      { descrizione: 'Location', link_social: '', quantita: 1 },
      { descrizione: 'Trucco e parrucco', link_social: '', quantita: 1 },
      { descrizione: 'Styling', link_social: '', quantita: 1 },
      { descrizione: 'Catering', link_social: '', quantita: 1 },
      { descrizione: 'Post-produzione', link_social: '', quantita: 1 },
    ]
  },
  evento: {
    label: 'Evento',
    icon: Users,
    items: [
      { descrizione: 'Venue / Location', link_social: '', quantita: 1 },
      { descrizione: 'Catering', link_social: '', quantita: 1 },
      { descrizione: 'Staff e hostess', link_social: '', quantita: 1 },
      { descrizione: 'Allestimento', link_social: '', quantita: 1 },
      { descrizione: 'Audio e luci', link_social: '', quantita: 1 },
      { descrizione: 'Comunicazione e inviti', link_social: '', quantita: 1 },
    ]
  },
  consulenza: {
    label: 'Consulenza',
    icon: MessageSquare,
    items: [
      { descrizione: 'Ore consulenza', link_social: '', quantita: 1 },
      { descrizione: 'Analisi e report', link_social: '', quantita: 1 },
      { descrizione: 'Follow-up', link_social: '', quantita: 1 },
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
  const { clients, campaigns, addQuote, updateQuote, showToast, companySettings } = useApp();

  const [titolo, setTitolo] = useState(quote?.titolo || '');
  const [tipo, setTipo] = useState<Quote['tipo']>(quote?.tipo || 'custom');
  const [clientId, setClientId] = useState(quote?.client_id || '');
  const [campaignId, setCampaignId] = useState(quote?.campaign_id || '');
  const [stato, setStato] = useState<Quote['stato']>(quote?.stato || 'bozza');
  const [note, setNote] = useState(quote?.note || '');
  const [items, setItems] = useState<QuoteItem[]>(quote?.items || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totaleManuale, setTotaleManuale] = useState(quote?.totale ?? 0);

  const addItem = () => {
    setItems(prev => [...prev, { descrizione: '', link_social: '', quantita: 1 }]);
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      return { ...item, [field]: value };
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
        stato, note: note || undefined, subtotale: 0, iva_percent: 0, totale: totaleManuale, items
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
        text += `- ${item.descrizione} (x${item.quantita})`;
        if (item.link_social) text += ` | Link: ${item.link_social}`;
        text += `\n`;
      }
    });
    text += `\n*TOTALE:* €${totaleManuale.toLocaleString()}`;
    if (note) text += `\n\nNote: ${note}`;
    navigator.clipboard.writeText(text);
    showToast('Preventivo copiato per WhatsApp', 'success');
  };

  const exportPDF = () => {
    const client = clientId ? clients.find(c => c.id === clientId) : null;
    const cs = companySettings;
    const companyName = cs?.ragione_sociale || 'Advenire';
    const companyAddress = [cs?.indirizzo_via, cs?.indirizzo_cap, cs?.indirizzo_citta, cs?.indirizzo_paese].filter(Boolean).join(', ');
    const companyContacts = [cs?.email, cs?.telefono].filter(Boolean).join(' — ');
    const companyFiscal = [cs?.piva ? `P.IVA ${cs.piva}` : '', cs?.codice_fiscale ? `C.F. ${cs.codice_fiscale}` : ''].filter(Boolean).join(' — ');
    const printContent = `
      <html>
        <head>
          <title>Preventivo - ${titolo}</title>
          <style>
            body { font-family: 'Helvetica Neue', sans-serif; padding: 50px; color: #111; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #111; padding-bottom: 20px; }
            .logo { font-size: 28px; font-weight: 900; text-transform: uppercase; letter-spacing: -1px; }
            .logo-sub { font-size: 10px; text-transform: uppercase; letter-spacing: 3px; color: #666; }
            .company-info { font-size: 9px; color: #888; margin-top: 6px; line-height: 1.6; }
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
              <div class="logo">${companyName}</div>
              <div class="logo-sub">Talent Management</div>
              <div class="company-info">
                ${companyAddress ? `${companyAddress}<br/>` : ''}
                ${companyContacts ? `${companyContacts}<br/>` : ''}
                ${companyFiscal ? `${companyFiscal}` : ''}
              </div>
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
              <tr><th>Descrizione</th><th>Link Social</th><th style="text-align:right">Qtà</th></tr>
            </thead>
            <tbody>
              ${items.filter(item => item.descrizione).map(item => `
                <tr>
                  <td>${item.descrizione}</td>
                  <td>${item.link_social ? `<a href="${item.link_social}" target="_blank" style="color:#2563eb;text-decoration:underline">${item.link_social}</a>` : '-'}</td>
                  <td class="num">${item.quantita}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="row final"><span>TOTALE</span><span>€${totaleManuale.toLocaleString()}</span></div>
          </div>

          ${note ? `<div class="notes"><strong>Note:</strong> ${note}</div>` : ''}

          <div class="footer">${companyName} — Preventivo generato il ${format(new Date(), 'dd/MM/yyyy')}${cs?.pec ? ` — PEC: ${cs.pec}` : ''}${cs?.website ? ` — ${cs.website}` : ''}</div>
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
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] flex justify-between items-center shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">
              {quote ? 'Modifica Preventivo' : 'Nuovo Preventivo'}
            </DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Preventivatore Advenire</p>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={copyWhatsApp} title="Copia per WhatsApp" className="text-muted-foreground hover:text-emerald-400">
              <Copy size={16} />
            </Button>
            <Button variant="ghost" size="icon" onClick={exportPDF} title="Esporta PDF" className="text-muted-foreground hover:text-blue-400">
              <Download size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label>Titolo *</Label>
              <Input
                type="text"
                required
                placeholder="es. Preventivo Campagna Estate 2026"
                value={titolo}
                onChange={e => setTitolo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 appearance-none"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
              >
                <option value="">Nessun cliente</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.ragione_sociale}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Campagna</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 appearance-none"
                value={campaignId}
                onChange={e => setCampaignId(e.target.value)}
              >
                <option value="">Nessuna campagna</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 appearance-none"
                value={stato}
                onChange={e => setStato(e.target.value as Quote['stato'])}
              >
                <option value="bozza">Bozza</option>
                <option value="inviato">Inviato</option>
                <option value="accettato">Accettato</option>
                <option value="rifiutato">Rifiutato</option>
              </select>
            </div>
            <div />
          </div>

          {/* Templates */}
          <div>
            <Label className="block mb-2">Template Predefiniti</Label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(QUOTE_TEMPLATES).map(([key, tmpl]) => {
                const Icon = tmpl.icon;
                return (
                  <Button
                    key={key}
                    variant={tipo === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => loadTemplate(key)}
                    className="gap-1.5"
                  >
                    <Icon size={12} />
                    {tmpl.label}
                  </Button>
                );
              })}
              <Button
                variant={tipo === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setTipo('custom'); setItems([]); }}
                className="gap-1.5"
              >
                <Settings size={12} />
                Personalizzato
              </Button>
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <Label>Voci del Preventivo</Label>
              <Button variant="ghost" size="sm" onClick={addItem} className="text-primary gap-1">
                <Plus size={12} /> Aggiungi Voce
              </Button>
            </div>

            <div className="space-y-2">
              {/* Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-1">
                <div className="col-span-5 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Descrizione</div>
                <div className="col-span-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Link Social</div>
                <div className="col-span-2 text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-right">Qtà</div>
                <div className="col-span-1" />
              </div>

              {items.map((item, idx) => (
                <GlassCard key={idx} className="grid grid-cols-12 gap-2 items-center px-3 py-2">
                  <div className="col-span-5">
                    <input
                      type="text"
                      className="w-full bg-transparent text-sm text-foreground font-medium focus:outline-none placeholder-muted-foreground"
                      placeholder="Descrizione voce..."
                      value={item.descrizione}
                      onChange={e => updateItem(idx, 'descrizione', e.target.value)}
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      className="w-full bg-transparent text-sm text-foreground font-medium focus:outline-none placeholder-muted-foreground"
                      placeholder="https://..."
                      value={item.link_social}
                      onChange={e => updateItem(idx, 'link_social', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number" min={1}
                      className="w-full bg-transparent text-sm text-foreground font-medium focus:outline-none text-right"
                      value={item.quantita}
                      onChange={e => updateItem(idx, 'quantita', Number(e.target.value))}
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <Button variant="ghost" size="icon" onClick={() => removeItem(idx)} className="h-7 w-7 text-muted-foreground hover:text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </GlassCard>
              ))}

              {items.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  Nessuna voce. Seleziona un template o aggiungi voci personalizzate.
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <GlassCard variant="prominent" className="p-5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-primary uppercase tracking-widest">Totale</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-lg font-black">€</span>
                <Input
                  type="number" min={0}
                  className="w-40 text-2xl font-black text-right h-12"
                  value={totaleManuale || ''}
                  onChange={e => setTotaleManuale(Number(e.target.value))}
                />
              </div>
            </div>
          </GlassCard>

          {/* Note */}
          <div className="space-y-1.5">
            <Label>Note</Label>
            <Textarea
              rows={2}
              placeholder="Note aggiuntive..."
              value={note}
              onChange={e => setNote(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/[0.06] flex gap-3 shrink-0">
          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="flex-1"
            size="lg"
          >
            {isSubmitting ? 'Salvataggio...' : (quote ? 'Salva Modifiche' : 'Crea Preventivo')}
          </Button>
          <Button variant="outline" size="lg" onClick={onClose}>
            Annulla
          </Button>
        </div>
      </DialogContent>
    </Dialog>
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

  const getStatoBadgeVariant = (stato: string): "glass" | "default" | "success" | "destructive" | "warning" => {
    switch (stato) {
      case 'bozza': return 'glass';
      case 'inviato': return 'default';
      case 'accettato': return 'success';
      case 'rifiutato': return 'destructive';
      default: return 'glass';
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="p-6 border-b border-white/[0.06] flex justify-between items-center shrink-0">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Preventivi</DialogTitle>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
              {quotes.length} preventiv{quotes.length === 1 ? 'o' : 'i'} totali
            </p>
          </DialogHeader>
          <Button onClick={() => setShowNewQuote(true)} size="sm" className="gap-1.5">
            <Plus size={14} /> Nuovo
          </Button>
        </div>

        {/* Filters */}
        <div className="px-6 pt-4 flex items-center gap-2">
          {['ALL', 'bozza', 'inviato', 'accettato', 'rifiutato'].map(s => (
            <Button
              key={s}
              variant={filterStato === s ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilterStato(s)}
              className="text-[9px] font-bold uppercase tracking-widest"
            >
              {s === 'ALL' ? 'Tutti' : s.charAt(0).toUpperCase() + s.slice(1)}
            </Button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredQuotes.map(q => {
            const client = q.client_id ? clients.find(c => c.id === q.client_id) : null;
            return (
              <GlassCard
                key={q.id}
                variant="interactive"
                hover
                className="p-4 group"
                onClick={() => setEditingQuote(q)}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={getStatoBadgeVariant(q.stato)}>
                        {q.stato}
                      </Badge>
                      <Badge variant="outline">
                        {q.tipo}
                      </Badge>
                    </div>
                    <p className="text-sm font-black text-foreground group-hover:text-primary transition-colors truncate">{q.titolo}</p>
                    <div className="flex items-center gap-3 mt-1">
                      {client && <span className="text-[10px] text-muted-foreground font-bold">{client.ragione_sociale}</span>}
                      {q.createdAt && (
                        <span className="text-[10px] text-muted-foreground/60 font-bold">
                          {format(new Date(q.createdAt), 'dd MMM yyyy', { locale: it })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-black text-foreground">{'\u20AC'}{q.totale.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground font-bold">{q.items.length} voci</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={e => { e.stopPropagation(); handleDelete(q.id); }}
                      className="opacity-0 group-hover:opacity-100 h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            );
          })}

          {filteredQuotes.length === 0 && (
            <div className="text-center py-12">
              <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nessun preventivo</p>
              <p className="text-[10px] text-muted-foreground/60 mt-2">Crea il tuo primo preventivo</p>
            </div>
          )}
        </div>

        {/* Sub-modals */}
        {showNewQuote && <QuoteEditor onClose={() => setShowNewQuote(false)} />}
        {editingQuote && <QuoteEditor quote={editingQuote} onClose={() => setEditingQuote(null)} />}
      </DialogContent>
    </Dialog>
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

  // ==================== TALENT VIEW ====================

  if (role === 'talent' && talentFinance) {
    return (
      <AnimatedContainer className="space-y-8">
        <PageHeader
          title="I Miei Guadagni"
          subtitle="Riepilogo finanziario e stato pagamenti"
        />

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <motion.div variants={staggerItem}>
            <StatCard
              label="Totale Maturato"
              value={`\u20AC${talentFinance.totalEarned.toLocaleString()}`}
              icon={Wallet}
              color="white"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              label="Incassato"
              value={`\u20AC${talentFinance.paid.toLocaleString()}`}
              icon={ArrowUpRight}
              color="emerald"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <StatCard
              label="In Attesa"
              value={`\u20AC${talentFinance.pending.toLocaleString()}`}
              icon={TrendingUp}
              color="amber"
            />
          </motion.div>
        </motion.div>

        <GlassCard variant="prominent" className="overflow-hidden">
          <div className="px-6 py-4 border-b border-white/[0.06]">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Storico Pagamenti</h3>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {talentFinance.myCollabs.map(col => {
              const campaign = campaigns.find(c => c.id === col.campaignId);
              return (
                <div key={col.id} className="p-5 flex items-center justify-between hover:bg-white/[0.03] transition-all">
                  <div>
                    <h4 className="text-sm font-black text-foreground">{col.brand}</h4>
                    <p className="text-[10px] font-bold text-muted-foreground">{campaign?.name} - {col.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-foreground">{'\u20AC'}{col.fee.toLocaleString()}</p>
                    <Badge
                      variant={col.paymentStatus === 'Saldato' ? 'success' : 'warning'}
                      className="mt-1"
                    >
                      {col.paymentStatus}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      </AnimatedContainer>
    );
  }

  // ==================== ADMIN VIEW ====================

  return (
    <AnimatedContainer className="space-y-8 pb-20">
      <PageHeader
        title="Finanze"
        subtitle="Analisi profittabilità e flussi di cassa"
        actions={
          <>
            <Button variant="outline" onClick={() => setShowQuotesList(true)} className="gap-2">
              <Calculator size={14} className="text-primary" />
              Preventivatore
            </Button>
            <Button variant="glass" onClick={() => setShowIncomeModal(true)} className="gap-2">
              <Plus size={14} className="text-emerald-400" />
              Reg. Incasso
            </Button>
            <Button variant="glass" onClick={() => setShowCostModal(true)} className="gap-2">
              <Plus size={14} className="text-red-400" />
              Reg. Costo
            </Button>
          </>
        }
      />

      {/* KPI Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div variants={staggerItem}>
          <StatCard
            label="Fatturato"
            value={`\u20AC${analytics.totalRevenue.toLocaleString()}`}
            icon={Wallet}
            color="white"
            trend={{ value: 0, label: `\u20AC${analytics.cashIn.toLocaleString()} incassati` }}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard
            label="Payout Talent"
            value={`\u20AC${analytics.totalTalentPayouts.toLocaleString()}`}
            icon={Users}
            color="blue"
            trend={{ value: 0, label: `${analytics.totalRevenue > 0 ? ((analytics.totalTalentPayouts / analytics.totalRevenue) * 100).toFixed(0) : 0}% del fatturato` }}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <StatCard
            label="Costi Extra"
            value={`\u20AC${analytics.totalExtraCosts.toLocaleString()}`}
            icon={ArrowDownRight}
            color="red"
            trend={{ value: 0, label: "Produzione, logistica, ads" }}
          />
        </motion.div>
        <motion.div variants={staggerItem}>
          <GlassCard hover className="p-5 border-emerald-500/20">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-2">
                  Utile Netto
                </p>
                <p className="text-2xl font-black tracking-tight text-foreground">
                  {'\u20AC'}{analytics.grossProfit.toLocaleString()}
                </p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10">
                <TrendingUp size={18} className="text-emerald-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(analytics.margin, 100)}%` }} />
              </div>
              <span className="text-[10px] font-black text-emerald-400">{analytics.margin.toFixed(1)}%</span>
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Filter Bar */}
      <GlassCard className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 p-2 sm:w-fit">
        <div className="flex items-center px-3 py-1.5 border-r border-white/[0.06]">
          <Filter size={14} className="text-muted-foreground mr-2" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Filtra</span>
        </div>
        <select
          value={selectedCampaignId}
          onChange={(e) => setSelectedCampaignId(e.target.value)}
          className="bg-transparent border-none text-xs font-semibold text-foreground focus:ring-0 cursor-pointer outline-none min-w-[180px]"
        >
          <option value="ALL" className="bg-zinc-900">Tutte le Campagne</option>
          {campaigns.map(c => <option key={c.id} value={c.id} className="bg-zinc-900">{c.name}</option>)}
        </select>
        <div className="flex items-center gap-2 pl-3 border-l border-white/[0.06]">
          <Calendar size={14} className="text-muted-foreground" />
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))} className="bg-transparent border-none text-xs font-semibold text-foreground focus:ring-0 w-[110px]" />
          <span className="text-muted-foreground">-</span>
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))} className="bg-transparent border-none text-xs font-semibold text-foreground focus:ring-0 w-[110px]" />
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entrate */}
        <GlassCard variant="prominent" className="overflow-hidden">
          <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <ArrowUpRight size={16} className="text-emerald-400" /> Flusso Entrate
            </h3>
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {analytics.filteredIncome.length > 0 ? analytics.filteredIncome.map(inc => {
              const camp = campaigns.find(c => c.id === inc.campaignId);
              return (
                <div key={inc.id} className="p-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all flex items-center justify-between group">
                  <div>
                    <p className="text-xs font-black text-foreground">{camp?.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(inc.date), 'dd MMM yyyy', { locale: it })} - {inc.note || 'Nessuna nota'}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm font-black text-foreground">{'\u20AC'}{inc.amount.toLocaleString()}</p>
                      <Badge variant={inc.status === 'received' ? 'success' : 'warning'} className="text-[9px]">
                        {inc.status === 'received' ? 'Incassato' : 'In Attesa'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteIncome(inc.id)}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">Nessun movimento</div>
            )}
          </div>
        </GlassCard>

        {/* Uscite */}
        <GlassCard variant="prominent" className="overflow-hidden">
          <div className="p-5 border-b border-white/[0.06] flex justify-between items-center">
            <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <ArrowDownRight size={16} className="text-red-400" /> Costi Extra
            </h3>
          </div>
          <div className="max-h-[350px] overflow-y-auto">
            {analytics.filteredCosts.length > 0 ? analytics.filteredCosts.map(cost => {
              const camp = campaigns.find(c => c.id === cost.campaignId);
              return (
                <div key={cost.id} className="p-4 border-b border-white/[0.04] hover:bg-white/[0.03] transition-all flex items-center justify-between group">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="glass">{cost.category}</Badge>
                      <span className="text-xs font-black text-foreground">{camp?.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{cost.provider} - {format(new Date(cost.date), 'dd MMM', { locale: it })}</p>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="text-sm font-black text-foreground">{'\u20AC'}{cost.amount.toLocaleString()}</p>
                      <Badge variant={cost.status === 'paid' ? 'default' : 'glass'} className="text-[9px]">
                        {cost.status === 'paid' ? 'Pagato' : 'Da Pagare'}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteExtraCost(cost.id)}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 text-muted-foreground hover:text-destructive"
                    >
                      <X size={12} />
                    </Button>
                  </div>
                </div>
              );
            }) : (
              <div className="p-8 text-center text-muted-foreground text-xs font-bold uppercase tracking-widest">Nessun costo extra</div>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Quotes List Modal */}
      {showQuotesList && <QuotesList onClose={() => setShowQuotesList(false)} />}

      {/* Add Cost Modal */}
      <Dialog open={showCostModal} onOpenChange={setShowCostModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Nuovo Costo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddCost} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Campagna</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 appearance-none"
                value={newCost.campaignId}
                onChange={e => setNewCost({ ...newCost, campaignId: e.target.value })}
              >
                <option value="">Seleziona Campagna...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 appearance-none"
                  value={newCost.category}
                  onChange={e => setNewCost({ ...newCost, category: e.target.value })}
                >
                  <option value="videomaker">Videomaker</option>
                  <option value="luci">Luci & Service</option>
                  <option value="van">Trasporti / Van</option>
                  <option value="ads">Advertising</option>
                  <option value="location">Location</option>
                  <option value="altro">Altro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Importo</Label>
                <Input
                  type="number"
                  placeholder="Importo €"
                  value={newCost.amount || ''}
                  onChange={e => setNewCost({ ...newCost, amount: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Fornitore</Label>
              <Input
                type="text"
                placeholder="Fornitore (opzionale)"
                value={newCost.provider}
                onChange={e => setNewCost({ ...newCost, provider: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={newCost.date}
                onChange={e => setNewCost({ ...newCost, date: e.target.value })}
              />
            </div>
            <Button type="submit" variant="destructive" size="lg" className="w-full mt-2">
              Registra Costo
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Income Modal */}
      <Dialog open={showIncomeModal} onOpenChange={setShowIncomeModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Nuovo Incasso</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddIncome} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Campagna</Label>
              <select
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 appearance-none"
                value={newIncome.campaignId}
                onChange={e => setNewIncome({ ...newIncome, campaignId: e.target.value })}
              >
                <option value="">Seleziona Campagna...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Importo</Label>
              <Input
                type="number"
                placeholder="Importo €"
                value={newIncome.amount || ''}
                onChange={e => setNewIncome({ ...newIncome, amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Data</Label>
              <Input
                type="date"
                value={newIncome.date}
                onChange={e => setNewIncome({ ...newIncome, date: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Note</Label>
              <Input
                type="text"
                placeholder="Note (Fattura N., Bonifico...)"
                value={newIncome.notes}
                onChange={e => setNewIncome({ ...newIncome, notes: e.target.value })}
              />
            </div>
            <Button type="submit" size="lg" className="w-full mt-2">
              Registra Incasso
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AnimatedContainer>
  );
};

export default Finance;
