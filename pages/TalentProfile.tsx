
import React, { useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Copy, Plus, X, Save, Edit3, Trash2, Upload, ExternalLink,
  Download, Instagram, Phone, Mail, Calendar, MapPin, CreditCard,
  Briefcase, FileText, StickyNote, BarChart3, DollarSign, Link as LinkIcon,
  ShieldCheck, Eye, EyeOff, Share2, Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Talent, Campaign, Appointment, CampaignTalent } from '../types';
import { useApp } from '../context/AppContext';

type TabId = 'panoramica' | 'foto' | 'anagrafica' | 'pagamenti' | 'social' | 'indirizzo' | 'dashboard' | 'note' | 'finanze';

const TABS: { id: TabId; label: string }[] = [
  { id: 'panoramica', label: 'Panoramica' },
  { id: 'foto', label: 'Foto' },
  { id: 'anagrafica', label: 'Dati Anagrafici' },
  { id: 'pagamenti', label: 'Pagamenti' },
  { id: 'social', label: 'Social' },
  { id: 'indirizzo', label: 'Indirizzo' },
  { id: 'dashboard', label: 'Mini-Dashboard' },
  { id: 'note', label: 'Note' },
  { id: 'finanze', label: 'Finanze' },
];

interface TalentProfileProps {
  talents: Talent[];
  collaborations: any[];
  appointments: Appointment[];
  campaigns: Campaign[];
  addCollaboration: (data: any) => Promise<any>;
  role: string;
}

const TalentProfile: React.FC<TalentProfileProps> = ({ talents, appointments, campaigns }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    updateTalent, deleteTalent, uploadTalentFile, showToast, isOnline,
    campaignTalents, addCampaignTalent
  } = useApp();

  const talent = talents.find(t => t.id === id);
  const [activeTab, setActiveTab] = useState<TabId>('panoramica');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Talent>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'gallery' | 'attachments' | 'photo'>('gallery');
  const [sensitiveVisible, setSensitiveVisible] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Talent's campaign_talents (with joined data)
  const talentCTs = useMemo(() =>
    campaignTalents.filter(ct => ct.talent_id === id),
    [campaignTalents, id]
  );

  // Finance calculations
  const totalEarnings = useMemo(() => talentCTs.reduce((acc, ct) => acc + ct.compenso_lordo, 0), [talentCTs]);
  const paidEarnings = useMemo(() => talentCTs.filter(ct => ct.stato === 'pagato').reduce((acc, ct) => acc + ct.compenso_lordo, 0), [talentCTs]);
  const pendingEarnings = totalEarnings - paidEarnings;

  if (!talent) return (
    <div className="p-20 text-center">
      <p className="font-black text-zinc-700 uppercase tracking-widest">Talent non trovato.</p>
      <button onClick={() => navigate('/roster')} className="mt-4 text-blue-500 font-bold text-sm hover:text-white transition-colors">Torna al Roster</button>
    </div>
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiato`, 'success');
  };

  const handleStartEdit = () => {
    setEditForm({ ...talent });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateTalent(talent.id, editForm);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTalent(talent.id);
      navigate('/roster');
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    try {
      for (const file of Array.from(files) as File[]) {
        await uploadTalentFile(talent.id, uploadType, file, {
          name: file.name,
          attachmentType: uploadType === 'attachments' ? 'document' : undefined
        });
      }
      setShowUploadModal(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Copy all social links
  const handleCopySocial = () => {
    const lines = [
      talent.instagram && `Instagram: ${talent.instagram}`,
      talent.tiktok && `TikTok: ${talent.tiktok}`,
      talent.youtube_url && `YouTube: ${talent.youtube_url}`,
      talent.twitch_url && `Twitch: ${talent.twitch_url}`,
      talent.other_socials && `Altri: ${talent.other_socials}`,
    ].filter(Boolean).join('\n');
    if (lines) copyToClipboard(lines, 'Social');
  };

  // Copy billing data
  const handleCopyBilling = () => {
    const lines = [
      talent.billing_name && `Intestatario: ${talent.billing_name}`,
      talent.vat && `P.IVA: ${talent.vat}`,
      talent.fiscal_code && `C.F.: ${talent.fiscal_code}`,
      talent.iban && `IBAN: ${talent.iban}`,
      talent.bank_name && `Banca: ${talent.bank_name}`,
      talent.paypal_email && `PayPal: ${talent.paypal_email}`,
      talent.billing_address_street && `Indirizzo: ${talent.billing_address_street}, ${talent.billing_address_city || ''} ${talent.billing_address_zip || ''} ${talent.billing_address_country || ''}`,
    ].filter(Boolean).join('\n');
    if (lines) copyToClipboard(lines, 'Dati fatturazione');
  };

  // WhatsApp finance copy
  const handleCopyWhatsApp = () => {
    const paidCTs = talentCTs.filter(ct => ct.stato === 'pagato');
    const unpaidCTs = talentCTs.filter(ct => ct.stato !== 'pagato');

    let text = `RIEPILOGO COMPENSI - ${talent.firstName} ${talent.lastName}\n\n`;

    if (paidCTs.length > 0) {
      text += `CAMPAGNE SALDATE:\n`;
      paidCTs.forEach(ct => {
        const camp = campaigns.find(c => c.id === ct.campaign_id);
        text += `- ${camp?.name || 'Campagna'}: €${ct.compenso_lordo.toLocaleString()}\n`;
      });
      text += '\n';
    }

    if (unpaidCTs.length > 0) {
      text += `CAMPAGNE DA SALDARE:\n`;
      unpaidCTs.forEach(ct => {
        const camp = campaigns.find(c => c.id === ct.campaign_id);
        text += `- ${camp?.name || 'Campagna'}: €${ct.compenso_lordo.toLocaleString()}\n`;
      });
      text += '\n';
    }

    text += `TOTALE SALDATO: €${paidEarnings.toLocaleString()}\n`;
    text += `TOTALE DA SALDARE: €${pendingEarnings.toLocaleString()}`;

    copyToClipboard(text, 'Riepilogo WhatsApp');
  };

  // Assign to campaign form
  const [assignForm, setAssignForm] = useState({ campaign_id: '', compenso_lordo: 0 });

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addCampaignTalent({
        campaign_id: assignForm.campaign_id,
        talent_id: talent.id,
        compenso_lordo: assignForm.compenso_lordo,
        stato: 'confermato' as any
      } as any);
      setShowAssignModal(false);
      setAssignForm({ campaign_id: '', compenso_lordo: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  // Field helper for edit mode
  const Field: React.FC<{ label: string; value?: string; field: string; type?: string; placeholder?: string }> = ({
    label, value, field, type = 'text', placeholder
  }) => (
    <div>
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">{label}</label>
      {isEditing ? (
        <input
          type={type}
          value={(editForm as any)[field] || ''}
          onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={placeholder}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
        />
      ) : (
        <p className="text-sm text-white font-medium py-2">{value || '—'}</p>
      )}
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/roster')} className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-all">
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-zinc-800 overflow-hidden border-2 border-white/10">
              {talent.photoUrl ? (
                <img src={talent.photoUrl} className="w-full h-full object-cover" alt="" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500 font-black">
                  {talent.firstName.charAt(0)}{talent.lastName.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight leading-none">
                {talent.firstName} {talent.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {talent.stageName && <span className="text-xs text-zinc-500">{talent.stageName}</span>}
                <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase ${
                  talent.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                }`}>
                  {talent.status === 'active' ? 'Attivo' : 'Inattivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all">
                <X size={14} /> Annulla
              </button>
              <button onClick={handleSaveEdit} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest text-white transition-all">
                <Save size={14} /> Salva
              </button>
            </>
          ) : (
            <>
              <button onClick={handleStartEdit} className="flex items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all">
                <Edit3 size={14} /> Modifica
              </button>
              <button onClick={() => setShowAssignModal(true)} className="flex items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all">
                <Briefcase size={14} /> Assegna a Campagna
              </button>
              <button onClick={handleCopySocial} className="flex items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all">
                <Copy size={14} /> Social
              </button>
              <button onClick={handleCopyBilling} className="flex items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all">
                <Copy size={14} /> Fatturazione
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto -mx-6 px-6">
        <div className="flex gap-1 bg-zinc-900/40 p-1 rounded-xl border border-white/5 w-fit min-w-full sm:min-w-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {/* TAB: Panoramica */}
          {activeTab === 'panoramica' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Info Rapide</h3>
                <div className="space-y-3">
                  {talent.email && <div className="flex items-center gap-3 text-sm"><Mail size={14} className="text-zinc-600" /><span className="text-zinc-300">{talent.email}</span></div>}
                  {talent.phone && <div className="flex items-center gap-3 text-sm"><Phone size={14} className="text-zinc-600" /><span className="text-zinc-300">{talent.phone}</span></div>}
                  {talent.birthDate && <div className="flex items-center gap-3 text-sm"><Calendar size={14} className="text-zinc-600" /><span className="text-zinc-300">{format(parseISO(talent.birthDate), 'dd MMMM yyyy', { locale: it })}</span></div>}
                  {(talent.address || talent.address_city) && <div className="flex items-center gap-3 text-sm"><MapPin size={14} className="text-zinc-600" /><span className="text-zinc-300">{talent.address || `${talent.address_city || ''}`}</span></div>}
                </div>
              </div>

              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Campagne Recenti</h3>
                {talentCTs.length === 0 ? (
                  <p className="text-xs text-zinc-700 italic">Nessuna campagna assegnata</p>
                ) : (
                  <div className="space-y-2">
                    {talentCTs.slice(0, 5).map(ct => {
                      const camp = campaigns.find(c => c.id === ct.campaign_id);
                      return (
                        <div key={ct.id} className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl">
                          <div>
                            <p className="text-xs font-bold text-white">{camp?.name || 'Campagna'}</p>
                            <p className="text-[10px] text-zinc-500">{ct.stato}</p>
                          </div>
                          <span className="text-xs font-bold text-zinc-400">€{ct.compenso_lordo.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Stato</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Campagne</span>
                    <span className="text-sm font-black text-white">{talentCTs.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Totale compensi</span>
                    <span className="text-sm font-black text-blue-400">€{totalEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Saldato</span>
                    <span className="text-sm font-black text-emerald-400">€{paidEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-zinc-500">Da saldare</span>
                    <span className="text-sm font-black text-amber-400">€{pendingEarnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Foto */}
          {activeTab === 'foto' && (
            <div className="space-y-8">
              {/* Profile photo */}
              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Foto Profilo</h3>
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10">
                    {talent.photoUrl ? (
                      <img src={talent.photoUrl} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600 text-2xl font-black">
                        {talent.firstName.charAt(0)}{talent.lastName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => { setUploadType('photo'); setShowUploadModal(true); }}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                  >
                    <Upload size={14} /> Cambia Foto
                  </button>
                </div>
              </div>

              {/* Gallery */}
              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Galleria</h3>
                  <button
                    onClick={() => { setUploadType('gallery'); setShowUploadModal(true); }}
                    className="flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white"
                  >
                    <Plus size={14} /> Aggiungi
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {talent.gallery.map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/5 relative group cursor-pointer">
                      <img src={img} className="w-full h-full object-cover" alt="" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <button onClick={() => window.open(img, '_blank')} className="p-2 bg-white/10 rounded-lg"><ExternalLink size={14} className="text-white" /></button>
                        <a href={img} download className="p-2 bg-white/10 rounded-lg"><Download size={14} className="text-white" /></a>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => { setUploadType('gallery'); setShowUploadModal(true); }}
                    className="aspect-square rounded-xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-zinc-700 hover:text-blue-500 hover:border-blue-500/30 transition-all"
                  >
                    <Plus size={24} />
                    <span className="text-[9px] font-black uppercase mt-1">Aggiungi</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Dati Anagrafici */}
          {activeTab === 'anagrafica' && (
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Dati Anagrafici</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Nome *" value={talent.firstName} field="firstName" />
                <Field label="Cognome *" value={talent.lastName} field="lastName" />
                <Field label="Nome d'arte" value={talent.stageName} field="stageName" />
                <Field label="Nome visualizzato" value={talent.display_name} field="display_name" />
                <Field label="Telefono" value={talent.phone} field="phone" type="tel" />
                <Field label="Email" value={talent.email} field="email" type="email" />
                <Field label="Data di nascita" value={talent.birthDate ? format(parseISO(talent.birthDate), 'dd/MM/yyyy') : ''} field="birthDate" type="date" />
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Stato</label>
                  {isEditing ? (
                    <select
                      value={(editForm as any).status || 'active'}
                      onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                    >
                      <option value="active">Attivo</option>
                      <option value="inactive">Inattivo</option>
                    </select>
                  ) : (
                    <p className={`text-sm font-bold py-2 ${talent.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {talent.status === 'active' ? 'Attivo' : 'Inattivo'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Pagamenti e Fatturazione */}
          {activeTab === 'pagamenti' && (
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pagamenti e Fatturazione</h3>
                <button onClick={() => setSensitiveVisible(!sensitiveVisible)} className="flex items-center gap-1 text-[10px] font-black text-zinc-600 uppercase tracking-widest hover:text-white transition-all">
                  {sensitiveVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                  {sensitiveVisible ? 'Nascondi' : 'Mostra'}
                </button>
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Metodo Pagamento</label>
                {isEditing ? (
                  <select
                    value={(editForm as any).payout_method || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, payout_method: e.target.value as any }))}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                  >
                    <option value="">Seleziona...</option>
                    <option value="IBAN">IBAN</option>
                    <option value="PayPal">PayPal</option>
                    <option value="Entrambi">Entrambi</option>
                  </select>
                ) : (
                  <p className="text-sm text-white font-medium py-2">{talent.payout_method || '—'}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {(!talent.payout_method || talent.payout_method === 'IBAN' || talent.payout_method === 'Entrambi') && (
                  <>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">IBAN</label>
                      {isEditing ? (
                        <input value={(editForm as any).iban || ''} onChange={e => setEditForm(prev => ({ ...prev, iban: e.target.value }))} className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-blue-500/50 focus:outline-none" />
                      ) : (
                        <p className={`text-sm font-mono py-2 ${sensitiveVisible ? 'text-white' : 'text-zinc-800'}`}>
                          {sensitiveVisible ? (talent.iban || '—') : '••••••••••••••••'}
                        </p>
                      )}
                    </div>
                    <Field label="Nome Banca" value={sensitiveVisible ? talent.bank_name : '••••'} field="bank_name" />
                  </>
                )}
                {(!talent.payout_method || talent.payout_method === 'PayPal' || talent.payout_method === 'Entrambi') && (
                  <Field label="Email PayPal" value={sensitiveVisible ? talent.paypal_email : '••••'} field="paypal_email" type="email" />
                )}
                <Field label="P.IVA" value={sensitiveVisible ? talent.vat : '••••'} field="vat" />
                <Field label="Codice Fiscale" value={sensitiveVisible ? talent.fiscal_code : '••••'} field="fiscal_code" />
              </div>

              <div className="border-t border-white/5 pt-6">
                <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Dati Intestazione Fattura</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <Field label="Nome Intestatario" value={sensitiveVisible ? talent.billing_name : '••••'} field="billing_name" />
                  <Field label="Via" value={sensitiveVisible ? talent.billing_address_street : '••••'} field="billing_address_street" />
                  <Field label="Citta" value={sensitiveVisible ? talent.billing_address_city : '••••'} field="billing_address_city" />
                  <Field label="CAP" value={sensitiveVisible ? talent.billing_address_zip : '••••'} field="billing_address_zip" />
                  <Field label="Paese" value={sensitiveVisible ? talent.billing_address_country : '••••'} field="billing_address_country" />
                </div>
              </div>

              {!isEditing && (
                <button onClick={handleCopyBilling} className="flex items-center gap-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white transition-all">
                  <Copy size={12} /> Copia Dati Fatturazione
                </button>
              )}
            </div>
          )}

          {/* TAB: Social */}
          {activeTab === 'social' && (
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Social Media</h3>
                {!isEditing && (
                  <button onClick={handleCopySocial} className="flex items-center gap-1 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white">
                    <Copy size={12} /> Copia Tutti
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Instagram" value={talent.instagram} field="instagram" placeholder="https://instagram.com/..." />
                <Field label="TikTok" value={talent.tiktok} field="tiktok" placeholder="https://tiktok.com/@..." />
                <Field label="YouTube" value={talent.youtube_url} field="youtube_url" placeholder="https://youtube.com/..." />
                <Field label="Twitch" value={talent.twitch_url} field="twitch_url" placeholder="https://twitch.tv/..." />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Altri Social</label>
                {isEditing ? (
                  <textarea
                    value={(editForm as any).other_socials || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, other_socials: e.target.value }))}
                    rows={3}
                    placeholder="Un link per riga..."
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none resize-none"
                  />
                ) : (
                  <div className="bg-zinc-900/30 rounded-xl px-4 py-3 min-h-[60px]">
                    {talent.other_socials ? (
                      <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans">{talent.other_socials}</pre>
                    ) : (
                      <p className="text-sm text-zinc-700 italic">Nessun altro social</p>
                    )}
                  </div>
                )}
              </div>

              {/* Copiable box */}
              {!isEditing && (
                <div className="bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-2">Link Copiabili</p>
                  <div className="space-y-1 text-xs font-mono text-zinc-400">
                    {talent.instagram && <p>{talent.instagram}</p>}
                    {talent.tiktok && <p>{talent.tiktok}</p>}
                    {talent.youtube_url && <p>{talent.youtube_url}</p>}
                    {talent.twitch_url && <p>{talent.twitch_url}</p>}
                    {!talent.instagram && !talent.tiktok && !talent.youtube_url && !talent.twitch_url && (
                      <p className="italic text-zinc-700">Nessun link social</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: Indirizzo */}
          {activeTab === 'indirizzo' && (
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 space-y-6">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Indirizzo</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Via e Numero" value={talent.address_street || talent.address} field="address_street" />
                <Field label="Citta" value={talent.address_city} field="address_city" />
                <Field label="CAP" value={talent.address_zip} field="address_zip" />
                <Field label="Paese" value={talent.address_country} field="address_country" placeholder="Italia" />
              </div>

              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Note Spedizione</label>
                {isEditing ? (
                  <textarea
                    value={(editForm as any).shippingNotes || ''}
                    onChange={e => setEditForm(prev => ({ ...prev, shippingNotes: e.target.value }))}
                    rows={3}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none resize-none"
                  />
                ) : (
                  <p className="text-sm text-zinc-400 py-2">{talent.shippingNotes || '—'}</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: Mini-Dashboard */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Campagne Collegate</p>
                <p className="text-4xl font-black text-white">{talentCTs.length}</p>
              </div>
              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Appuntamenti</p>
                <p className="text-4xl font-black text-blue-400">{appointments.filter(a => a.talentId === talent.id).length}</p>
              </div>
              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6 text-center">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Ultimo Aggiornamento</p>
                <p className="text-sm font-bold text-zinc-400">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>
          )}

          {/* TAB: Note */}
          {activeTab === 'note' && (
            <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Note</h3>
              {isEditing ? (
                <textarea
                  value={(editForm as any).notes || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={10}
                  placeholder="Note libere sul talent..."
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none resize-none"
                />
              ) : (
                <div className="min-h-[200px] bg-zinc-900/30 rounded-xl px-4 py-3">
                  {talent.notes ? (
                    <pre className="text-sm text-zinc-300 whitespace-pre-wrap font-sans">{talent.notes}</pre>
                  ) : (
                    <p className="text-sm text-zinc-700 italic">Nessuna nota. Clicca "Modifica" per aggiungere.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: Finanze */}
          {activeTab === 'finanze' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Totale Compensi</p>
                  <p className="text-2xl font-black text-white">€{totalEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-[#0c0c0c] border border-emerald-500/10 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Saldato</p>
                  <p className="text-2xl font-black text-emerald-400">€{paidEarnings.toLocaleString()}</p>
                </div>
                <div className="bg-[#0c0c0c] border border-amber-500/10 rounded-2xl p-5">
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Da Saldare</p>
                  <p className="text-2xl font-black text-amber-400">€{pendingEarnings.toLocaleString()}</p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                  <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dettaglio Campagne</h3>
                  <button onClick={handleCopyWhatsApp} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">
                    <Share2 size={12} /> Copia per WhatsApp
                  </button>
                </div>

                {talentCTs.length === 0 ? (
                  <div className="py-16 text-center">
                    <DollarSign size={40} className="mx-auto text-zinc-800 mb-3" />
                    <p className="text-sm font-bold text-zinc-700">Nessuna campagna collegata</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-zinc-900/40 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                        <th className="px-5 py-3">Campagna</th>
                        <th className="px-5 py-3">Compenso Lordo</th>
                        <th className="px-5 py-3">Stato</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {talentCTs.map(ct => {
                        const camp = campaigns.find(c => c.id === ct.campaign_id);
                        return (
                          <tr key={ct.id} className="hover:bg-zinc-900/20 transition-all">
                            <td className="px-5 py-4">
                              <p className="text-sm font-bold text-white">{camp?.name || 'Campagna'}</p>
                              <p className="text-[10px] text-zinc-500">{camp?.tipo || ''}</p>
                            </td>
                            <td className="px-5 py-4 text-sm font-bold text-white">€{ct.compenso_lordo.toLocaleString()}</td>
                            <td className="px-5 py-4">
                              <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                                ct.stato === 'pagato' ? 'bg-emerald-500/10 text-emerald-400' :
                                ct.stato === 'consegnato' ? 'bg-blue-500/10 text-blue-400' :
                                ct.stato === 'confermato' ? 'bg-amber-500/10 text-amber-400' :
                                'bg-zinc-800 text-zinc-500'
                              }`}>
                                {ct.stato}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Delete button at bottom */}
      {!isEditing && (
        <div className="pt-6 border-t border-white/5">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-[10px] font-black text-red-500/60 uppercase tracking-widest hover:text-red-400 transition-all"
          >
            <Trash2 size={14} /> Elimina Talent
          </button>
        </div>
      )}

      {/* Assign to Campaign Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAssignModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-md shadow-3xl overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Assegna a Campagna</h3>
                <button onClick={() => setShowAssignModal(false)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white"><X size={18} /></button>
              </div>

              <div className="flex items-center gap-3 mb-6 p-3 bg-zinc-900/50 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden">
                  {talent.photoUrl ? <img src={talent.photoUrl} className="w-full h-full object-cover" alt="" /> : null}
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{talent.firstName} {talent.lastName}</p>
                  <p className="text-[10px] text-zinc-500">{talent.stageName}</p>
                </div>
              </div>

              <form onSubmit={handleAssign} className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Campagna *</label>
                  <select
                    required
                    value={assignForm.campaign_id}
                    onChange={e => setAssignForm(prev => ({ ...prev, campaign_id: e.target.value }))}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                  >
                    <option value="">Seleziona campagna...</option>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Compenso Lordo (€) *</label>
                  <input
                    type="number" required min={0}
                    value={assignForm.compenso_lordo}
                    onChange={e => setAssignForm(prev => ({ ...prev, compenso_lordo: Number(e.target.value) }))}
                    className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                  />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all mt-2">
                  Assegna Talent
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUploadModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-md shadow-3xl overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">
                  {uploadType === 'photo' ? 'Cambia Foto Profilo' : uploadType === 'gallery' ? 'Carica Foto' : 'Carica Documento'}
                </h3>
                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white"><X size={18} /></button>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-white/10 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500/30 transition-all"
              >
                <Upload size={36} className="mx-auto text-zinc-600 mb-3" />
                <p className="text-sm font-bold text-zinc-400">Clicca per selezionare</p>
                <p className="text-[10px] text-zinc-600 mt-1">
                  {uploadType === 'attachments' ? 'PDF, DOC, XLS' : 'JPG, PNG, WebP'}
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={uploadType === 'attachments' ? '.pdf,.doc,.docx,.xls,.xlsx' : 'image/*'}
                multiple={uploadType !== 'photo'}
                onChange={handleFileUpload}
                className="hidden"
              />

              {!isOnline && (
                <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-center">
                  <p className="text-xs font-bold text-amber-500">Upload non disponibile offline</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0c0c0c] border border-red-500/20 rounded-3xl w-full max-w-sm shadow-3xl overflow-hidden p-8 text-center">
              <Trash2 size={32} className="mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Elimina Talent</h3>
              <p className="text-xs text-zinc-500 mb-6">
                Eliminare <span className="text-white font-bold">{talent.firstName} {talent.lastName}</span>? Azione irreversibile.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-zinc-400 transition-all">
                  Annulla
                </button>
                <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-white transition-all">
                  Elimina
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TalentProfile;
