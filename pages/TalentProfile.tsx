
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Copy, Plus, X, Save, Edit3, Trash2, Upload, ExternalLink,
  Download, Phone, Mail, Calendar, MapPin,
  Briefcase, DollarSign,
  Eye, EyeOff, Share2, Check, Key, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { Talent, Campaign, Appointment } from '../types';
import { useApp } from '../context/AppContext';
import { talentsApi } from '../api';

import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { badgeVariants } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { StatusBadge } from '@/components/ui/status-badge';
import { staggerContainer, staggerItem } from '@/lib/animations';

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
  const [credentials, setCredentials] = useState<{ username: string; email: string; password: string } | null>(null);
  const [credentialsLoading, setCredentialsLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

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
      <p className="font-black text-muted-foreground uppercase tracking-widest">Talent non trovato.</p>
      <Button variant="link" onClick={() => navigate('/roster')} className="mt-4">Torna al Roster</Button>
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

  // Fetch credentials
  const fetchCredentials = useCallback(async () => {
    if (!talent?.id) return;
    setCredentialsLoading(true);
    try {
      const creds = await talentsApi.getCredentials(talent.id);
      setCredentials(creds);
    } catch {
      setCredentials(null);
    } finally {
      setCredentialsLoading(false);
    }
  }, [talent?.id]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const handleChangePassword = async () => {
    if (!talent?.id || !newPassword || newPassword.length < 6) return;
    setPasswordSaving(true);
    try {
      await talentsApi.changePassword(talent.id, newPassword);
      showToast('Password aggiornata', 'success');
      setNewPassword('');
      setShowChangePassword(false);
      fetchCredentials();
    } catch (err: any) {
      showToast(err.message || 'Errore aggiornamento password', 'error');
    } finally {
      setPasswordSaving(false);
    }
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
      <Label className="block mb-1.5">{label}</Label>
      {isEditing ? (
        <Input
          type={type}
          value={(editForm as any)[field] || ''}
          onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder={placeholder}
        />
      ) : (
        <p className="text-sm text-foreground font-medium py-2">{value || '—'}</p>
      )}
    </div>
  );

  return (
    <AnimatedContainer className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/roster')}>
            <ArrowLeft size={20} />
          </Button>

          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 border-2 border-white/[0.1]">
              {talent.photoUrl ? (
                <AvatarImage src={talent.photoUrl} alt="" />
              ) : null}
              <AvatarFallback className="text-base font-black">
                {talent.firstName.charAt(0)}{talent.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-black text-foreground uppercase tracking-tight leading-none">
                {talent.firstName} {talent.lastName}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                {talent.stageName && <span className="text-xs text-muted-foreground">{talent.stageName}</span>}
                <StatusBadge status={talent.status === 'active' ? 'active' : 'inactive'} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                <X size={14} /> Annulla
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveEdit}>
                <Save size={14} /> Salva
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={handleStartEdit}>
                <Edit3 size={14} /> Modifica
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAssignModal(true)}>
                <Briefcase size={14} /> Assegna a Campagna
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopySocial}>
                <Copy size={14} /> Social
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopyBilling}>
                <Copy size={14} /> Fatturazione
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="panoramica" value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
        <TabsList className="overflow-x-auto w-full justify-start h-auto flex-wrap">
          {TABS.map(tab => (
            <TabsTrigger key={tab.id} value={tab.id}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* TAB: Panoramica */}
        <TabsContent value="panoramica">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <GlassCard className="p-6 space-y-4" variants={staggerItem}>
                <Label>Info Rapide</Label>
                <div className="space-y-3">
                  {talent.email && <div className="flex items-center gap-3 text-sm"><Mail size={14} className="text-muted-foreground" /><span className="text-foreground/80">{talent.email}</span></div>}
                  {talent.phone && <div className="flex items-center gap-3 text-sm"><Phone size={14} className="text-muted-foreground" /><span className="text-foreground/80">{talent.phone}</span></div>}
                  {talent.birthDate && <div className="flex items-center gap-3 text-sm"><Calendar size={14} className="text-muted-foreground" /><span className="text-foreground/80">{format(parseISO(talent.birthDate), 'dd MMMM yyyy', { locale: it })}</span></div>}
                  {(talent.address || talent.address_city) && <div className="flex items-center gap-3 text-sm"><MapPin size={14} className="text-muted-foreground" /><span className="text-foreground/80">{talent.address || `${talent.address_city || ''}`}</span></div>}
                </div>
              </GlassCard>

              <GlassCard className="p-6 space-y-4" variants={staggerItem}>
                <Label>Campagne Recenti</Label>
                {talentCTs.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">Nessuna campagna assegnata</p>
                ) : (
                  <div className="space-y-2">
                    {talentCTs.slice(0, 5).map(ct => {
                      const camp = campaigns.find(c => c.id === ct.campaign_id);
                      return (
                        <div key={ct.id} className="flex items-center justify-between p-3 bg-white/[0.03] rounded-xl border border-white/[0.05]">
                          <div>
                            <p className="text-xs font-bold text-foreground">{camp?.name || 'Campagna'}</p>
                            <p className="text-[10px] text-muted-foreground">{ct.stato}</p>
                          </div>
                          <span className="text-xs font-bold text-muted-foreground">{'\u20AC'}{ct.compenso_lordo.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-6 space-y-4" variants={staggerItem}>
                <Label>Stato</Label>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Campagne</span>
                    <span className="text-sm font-black text-foreground">{talentCTs.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Totale compensi</span>
                    <span className="text-sm font-black text-blue-400">{'\u20AC'}{totalEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Saldato</span>
                    <span className="text-sm font-black text-emerald-400">{'\u20AC'}{paidEarnings.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Da saldare</span>
                    <span className="text-sm font-black text-amber-400">{'\u20AC'}{pendingEarnings.toLocaleString()}</span>
                  </div>
                </div>
              </GlassCard>
            </div>

            {/* Credenziali Accesso */}
            <GlassCard className="p-6 space-y-4" variants={staggerItem}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-blue-600/10 rounded-xl flex items-center justify-center">
                    <Key size={16} className="text-blue-500" />
                  </div>
                  <Label>Credenziali di Accesso</Label>
                </div>
                {credentials && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const text = `Credenziali accesso:\nEmail: ${credentials.email}\nUsername: ${credentials.username}\nPassword: ${credentials.password}`;
                      copyToClipboard(text, 'Credenziali');
                    }}
                  >
                    <Copy size={11} /> Copia
                  </Button>
                )}
              </div>

              {credentialsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 size={18} className="animate-spin text-muted-foreground" />
                </div>
              ) : credentials ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-[9px] block mb-1">Username</Label>
                      <p className="text-sm font-bold text-foreground select-all">{credentials.username}</p>
                    </div>
                    <div>
                      <Label className="text-[9px] block mb-1">Email</Label>
                      <p className="text-sm font-bold text-foreground select-all">{credentials.email}</p>
                    </div>
                    <div>
                      <Label className="text-[9px] block mb-1">Password</Label>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold font-mono select-all text-foreground">
                          {passwordVisible ? credentials.password : '••••••••'}
                        </p>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setPasswordVisible(!passwordVisible)}>
                          {passwordVisible ? <EyeOff size={13} /> : <Eye size={13} />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {showChangePassword ? (
                    <GlassCard className="flex items-end gap-3 p-4">
                      <div className="flex-1">
                        <Label className="text-[9px] block mb-1">Nuova Password (min. 6 caratteri)</Label>
                        <Input
                          type="text"
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          placeholder="Nuova password..."
                          className="font-mono"
                        />
                      </div>
                      <Button
                        onClick={handleChangePassword}
                        disabled={passwordSaving || newPassword.length < 6}
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        {passwordSaving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                        Salva
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => { setShowChangePassword(false); setNewPassword(''); }}
                      >
                        <X size={14} />
                      </Button>
                    </GlassCard>
                  ) : (
                    <Button variant="ghost" size="sm" onClick={() => setShowChangePassword(true)} className="text-blue-500 hover:text-blue-400">
                      <Key size={12} /> Cambia Password
                    </Button>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">Nessun account utente associato</p>
              )}
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* TAB: Foto */}
        <TabsContent value="foto">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-8">
            {/* Profile photo */}
            <GlassCard className="p-6" variants={staggerItem}>
              <Label className="mb-4 block">Foto Profilo</Label>
              <div className="flex items-center gap-6">
                <Avatar className="h-24 w-24 rounded-2xl border border-white/[0.1]">
                  {talent.photoUrl ? (
                    <AvatarImage src={talent.photoUrl} alt="" className="rounded-2xl" />
                  ) : null}
                  <AvatarFallback className="rounded-2xl text-2xl font-black">
                    {talent.firstName.charAt(0)}{talent.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  onClick={() => { setUploadType('photo'); setShowUploadModal(true); }}
                  size="sm"
                >
                  <Upload size={14} /> Cambia Foto
                </Button>
              </div>
            </GlassCard>

            {/* Gallery */}
            <GlassCard className="p-6" variants={staggerItem}>
              <div className="flex items-center justify-between mb-4">
                <Label>Galleria</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setUploadType('gallery'); setShowUploadModal(true); }}
                  className="text-blue-500 hover:text-blue-400"
                >
                  <Plus size={14} /> Aggiungi
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {talent.gallery.map((img, i) => (
                  <div key={i} className="aspect-square rounded-xl overflow-hidden border border-white/[0.08] relative group cursor-pointer">
                    <img src={img} className="w-full h-full object-cover" alt="" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                      <Button variant="glass" size="icon" className="h-8 w-8" onClick={() => window.open(img, '_blank')}>
                        <ExternalLink size={14} />
                      </Button>
                      <Button variant="glass" size="icon" className="h-8 w-8" asChild>
                        <a href={img} download><Download size={14} /></a>
                      </Button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() => { setUploadType('gallery'); setShowUploadModal(true); }}
                  className="aspect-square rounded-xl border-2 border-dashed border-white/[0.1] flex flex-col items-center justify-center text-muted-foreground hover:text-blue-500 hover:border-blue-500/30 transition-all"
                >
                  <Plus size={24} />
                  <span className="text-[9px] font-black uppercase mt-1">Aggiungi</span>
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* TAB: Dati Anagrafici */}
        <TabsContent value="anagrafica">
          <GlassCard className="p-6">
            <Label className="mb-6 block">Dati Anagrafici</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Nome *" value={talent.firstName} field="firstName" />
              <Field label="Cognome *" value={talent.lastName} field="lastName" />
              <Field label="Nome d'arte" value={talent.stageName} field="stageName" />
              <Field label="Nome visualizzato" value={talent.display_name} field="display_name" />
              <Field label="Telefono" value={talent.phone} field="phone" type="tel" />
              <Field label="Email" value={talent.email} field="email" type="email" />
              <Field label="Data di nascita" value={talent.birthDate ? format(parseISO(talent.birthDate), 'dd/MM/yyyy') : ''} field="birthDate" type="date" />
              <div>
                <Label className="block mb-1.5">Stato</Label>
                {isEditing ? (
                  <select
                    value={(editForm as any).status || 'active'}
                    onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200"
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
          </GlassCard>
        </TabsContent>

        {/* TAB: Pagamenti e Fatturazione */}
        <TabsContent value="pagamenti">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Label>Pagamenti e Fatturazione</Label>
              <Button variant="ghost" size="sm" onClick={() => setSensitiveVisible(!sensitiveVisible)}>
                {sensitiveVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                {sensitiveVisible ? 'Nascondi' : 'Mostra'}
              </Button>
            </div>

            <div>
              <Label className="block mb-1.5">Metodo Pagamento</Label>
              {isEditing ? (
                <select
                  value={(editForm as any).payout_method || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, payout_method: e.target.value as any }))}
                  className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200"
                >
                  <option value="">Seleziona...</option>
                  <option value="IBAN">IBAN</option>
                  <option value="PayPal">PayPal</option>
                  <option value="Entrambi">Entrambi</option>
                </select>
              ) : (
                <p className="text-sm text-foreground font-medium py-2">{talent.payout_method || '—'}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <div>
                <Label className="block mb-1.5">IBAN</Label>
                {isEditing ? (
                  <Input value={(editForm as any).iban || ''} onChange={e => setEditForm(prev => ({ ...prev, iban: e.target.value }))} className="font-mono" />
                ) : (
                  <p className={`text-sm font-mono py-2 ${sensitiveVisible ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                    {sensitiveVisible ? (talent.iban || '—') : '••••••••••••••••'}
                  </p>
                )}
              </div>
              <Field label="Nome Banca" value={sensitiveVisible ? talent.bank_name : '••••'} field="bank_name" />
              <Field label="Email PayPal / Revolut" value={sensitiveVisible ? talent.paypal_email : '••••'} field="paypal_email" />
              <Field label="P.IVA" value={sensitiveVisible ? talent.vat : '••••'} field="vat" />
              <Field label="Codice Fiscale" value={sensitiveVisible ? talent.fiscal_code : '••••'} field="fiscal_code" />
            </div>

            <Separator />

            <div>
              <Label className="mb-4 block">Dati Intestazione Fattura</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Nome Intestatario" value={sensitiveVisible ? talent.billing_name : '••••'} field="billing_name" />
                <Field label="Via" value={sensitiveVisible ? talent.billing_address_street : '••••'} field="billing_address_street" />
                <Field label="Citta" value={sensitiveVisible ? talent.billing_address_city : '••••'} field="billing_address_city" />
                <Field label="CAP" value={sensitiveVisible ? talent.billing_address_zip : '••••'} field="billing_address_zip" />
                <Field label="Paese" value={sensitiveVisible ? talent.billing_address_country : '••••'} field="billing_address_country" />
              </div>
            </div>

            {!isEditing && (
              <Button variant="ghost" size="sm" onClick={handleCopyBilling} className="text-blue-500 hover:text-blue-400">
                <Copy size={12} /> Copia Dati Fatturazione
              </Button>
            )}
          </GlassCard>
        </TabsContent>

        {/* TAB: Social */}
        <TabsContent value="social">
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <Label>Social Media</Label>
              {!isEditing && (
                <Button variant="ghost" size="sm" onClick={handleCopySocial} className="text-blue-500 hover:text-blue-400">
                  <Copy size={12} /> Copia Tutti
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Instagram URL" value={talent.instagram} field="instagram" placeholder="https://instagram.com/..." />
              <Field label="Instagram Followers" value={talent.instagramFollowers?.toString()} field="instagramFollowers" type="number" placeholder="0" />
              <Field label="TikTok URL" value={talent.tiktok} field="tiktok" placeholder="https://tiktok.com/@..." />
              <Field label="TikTok Followers" value={talent.tiktokFollowers?.toString()} field="tiktokFollowers" type="number" placeholder="0" />
              <Field label="YouTube URL" value={talent.youtube_url} field="youtube_url" placeholder="https://youtube.com/..." />
              <Field label="Twitch URL" value={talent.twitch_url} field="twitch_url" placeholder="https://twitch.tv/..." />
            </div>

            <div>
              <Label className="block mb-1.5">Altri Social</Label>
              {isEditing ? (
                <Textarea
                  value={(editForm as any).other_socials || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, other_socials: e.target.value }))}
                  rows={3}
                  placeholder="Un link per riga..."
                />
              ) : (
                <div className="bg-white/[0.02] rounded-xl px-4 py-3 min-h-[60px] border border-white/[0.05]">
                  {talent.other_socials ? (
                    <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans">{talent.other_socials}</pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nessun altro social</p>
                  )}
                </div>
              )}
            </div>

            {/* Copiable box */}
            {!isEditing && (
              <GlassCard className="p-4">
                <Label className="text-[9px] mb-2 block">Link Copiabili</Label>
                <div className="space-y-1 text-xs font-mono text-muted-foreground">
                  {talent.instagram && <p>{talent.instagram}</p>}
                  {talent.tiktok && <p>{talent.tiktok}</p>}
                  {talent.youtube_url && <p>{talent.youtube_url}</p>}
                  {talent.twitch_url && <p>{talent.twitch_url}</p>}
                  {!talent.instagram && !talent.tiktok && !talent.youtube_url && !talent.twitch_url && (
                    <p className="italic text-muted-foreground/50">Nessun link social</p>
                  )}
                </div>
              </GlassCard>
            )}
          </GlassCard>
        </TabsContent>

        {/* TAB: Indirizzo */}
        <TabsContent value="indirizzo">
          <GlassCard className="p-6 space-y-6">
            <Label>Indirizzo</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <Field label="Via e Numero" value={talent.address_street || talent.address} field="address_street" />
              <Field label="Citta" value={talent.address_city} field="address_city" />
              <Field label="CAP" value={talent.address_zip} field="address_zip" />
              <Field label="Paese" value={talent.address_country} field="address_country" placeholder="Italia" />
            </div>

            <div>
              <Label className="block mb-1.5">Note Spedizione</Label>
              {isEditing ? (
                <Textarea
                  value={(editForm as any).shippingNotes || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, shippingNotes: e.target.value }))}
                  rows={3}
                />
              ) : (
                <p className="text-sm text-muted-foreground py-2">{talent.shippingNotes || '—'}</p>
              )}
            </div>
          </GlassCard>
        </TabsContent>

        {/* TAB: Mini-Dashboard */}
        <TabsContent value="dashboard">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <GlassCard className="p-6 text-center" variants={staggerItem} hover>
              <Label className="mb-2 block">Campagne Collegate</Label>
              <p className="text-4xl font-black text-foreground">{talentCTs.length}</p>
            </GlassCard>
            <GlassCard className="p-6 text-center" variants={staggerItem} hover>
              <Label className="mb-2 block">Appuntamenti</Label>
              <p className="text-4xl font-black text-blue-400">{appointments.filter(a => a.talentId === talent.id).length}</p>
            </GlassCard>
            <GlassCard className="p-6 text-center" variants={staggerItem} hover>
              <Label className="mb-2 block">Ultimo Aggiornamento</Label>
              <p className="text-sm font-bold text-muted-foreground">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
            </GlassCard>
          </motion.div>
        </TabsContent>

        {/* TAB: Note */}
        <TabsContent value="note">
          <GlassCard className="p-6">
            <Label className="mb-4 block">Note</Label>
            {isEditing ? (
              <Textarea
                value={(editForm as any).notes || ''}
                onChange={e => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={10}
                placeholder="Note libere sul talent..."
              />
            ) : (
              <div className="min-h-[200px] bg-white/[0.02] rounded-xl px-4 py-3 border border-white/[0.05]">
                {talent.notes ? (
                  <pre className="text-sm text-foreground/80 whitespace-pre-wrap font-sans">{talent.notes}</pre>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Nessuna nota. Clicca "Modifica" per aggiungere.</p>
                )}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* TAB: Finanze */}
        <TabsContent value="finanze">
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <GlassCard className="p-5" variants={staggerItem}>
                <Label className="mb-1 block">Totale Compensi</Label>
                <p className="text-2xl font-black text-foreground">{'\u20AC'}{totalEarnings.toLocaleString()}</p>
              </GlassCard>
              <GlassCard className="p-5 border-emerald-500/10" variants={staggerItem}>
                <Label className="mb-1 block">Saldato</Label>
                <p className="text-2xl font-black text-emerald-400">{'\u20AC'}{paidEarnings.toLocaleString()}</p>
              </GlassCard>
              <GlassCard className="p-5 border-amber-500/10" variants={staggerItem}>
                <Label className="mb-1 block">Da Saldare</Label>
                <p className="text-2xl font-black text-amber-400">{'\u20AC'}{pendingEarnings.toLocaleString()}</p>
              </GlassCard>
            </div>

            {/* Table */}
            <GlassCard className="overflow-hidden" variants={staggerItem}>
              <div className="flex items-center justify-between p-4 border-b border-white/[0.06]">
                <Label>Dettaglio Campagne</Label>
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCopyWhatsApp}>
                  <Share2 size={12} /> Copia per WhatsApp
                </Button>
              </div>

              {talentCTs.length === 0 ? (
                <div className="py-16 text-center">
                  <DollarSign size={40} className="mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-bold text-muted-foreground">Nessuna campagna collegata</p>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-white/[0.02]">
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Campagna</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Compenso Lordo</th>
                      <th className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Stato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {talentCTs.map(ct => {
                      const camp = campaigns.find(c => c.id === ct.campaign_id);
                      return (
                        <tr key={ct.id} className="hover:bg-white/[0.03] transition-all">
                          <td className="px-5 py-4">
                            <p className="text-sm font-bold text-foreground">{camp?.name || 'Campagna'}</p>
                            <p className="text-[10px] text-muted-foreground">{camp?.tipo || ''}</p>
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-foreground">{'\u20AC'}{ct.compenso_lordo.toLocaleString()}</td>
                          <td className="px-5 py-4">
                            <span className={badgeVariants({
                              variant: ct.stato === 'pagato' ? 'success' :
                                ct.stato === 'consegnato' ? 'default' :
                                ct.stato === 'confermato' ? 'warning' :
                                'secondary'
                            })}>
                              {ct.stato}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </GlassCard>
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Delete button at bottom */}
      {!isEditing && (
        <div className="pt-6">
          <Separator className="mb-6" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive/60 hover:text-destructive"
          >
            <Trash2 size={14} /> Elimina Talent
          </Button>
        </div>
      )}

      {/* Assign to Campaign Modal */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">Assegna a Campagna</DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/[0.06]">
            <Avatar className="h-10 w-10">
              {talent.photoUrl ? <AvatarImage src={talent.photoUrl} alt="" /> : null}
              <AvatarFallback>{talent.firstName.charAt(0)}{talent.lastName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-bold text-foreground">{talent.firstName} {talent.lastName}</p>
              <p className="text-[10px] text-muted-foreground">{talent.stageName}</p>
            </div>
          </div>

          <form onSubmit={handleAssign} className="space-y-4">
            <div>
              <Label className="block mb-1.5">Campagna *</Label>
              <select
                required
                value={assignForm.campaign_id}
                onChange={e => setAssignForm(prev => ({ ...prev, campaign_id: e.target.value }))}
                className="flex h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2 text-sm text-foreground backdrop-blur-sm focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200"
              >
                <option value="">Seleziona campagna...</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label className="block mb-1.5">Compenso Lordo ({'\u20AC'}) *</Label>
              <Input
                type="number"
                required
                min={0}
                value={assignForm.compenso_lordo}
                onChange={e => setAssignForm(prev => ({ ...prev, compenso_lordo: Number(e.target.value) }))}
              />
            </div>
            <Button type="submit" className="w-full mt-2">
              Assegna Talent
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black uppercase tracking-tight">
              {uploadType === 'photo' ? 'Cambia Foto Profilo' : uploadType === 'gallery' ? 'Carica Foto' : 'Carica Documento'}
            </DialogTitle>
          </DialogHeader>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-white/[0.1] rounded-2xl p-10 text-center cursor-pointer hover:border-blue-500/30 hover:bg-white/[0.02] transition-all"
          >
            <Upload size={36} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-sm font-bold text-muted-foreground">Clicca per selezionare</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
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
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Modal */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm border-destructive/20 text-center">
          <div className="flex flex-col items-center">
            <Trash2 size={32} className="text-destructive mb-4" />
            <DialogHeader>
              <DialogTitle className="text-lg font-black uppercase tracking-tight">Elimina Talent</DialogTitle>
            </DialogHeader>
            <p className="text-xs text-muted-foreground mt-2 mb-6">
              Eliminare <span className="text-foreground font-bold">{talent.firstName} {talent.lastName}</span>? Azione irreversibile.
            </p>
            <div className="flex gap-3 w-full">
              <Button variant="outline" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                Annulla
              </Button>
              <Button variant="destructive" className="flex-1" onClick={handleDelete}>
                Elimina
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AnimatedContainer>
  );
};

export default TalentProfile;
