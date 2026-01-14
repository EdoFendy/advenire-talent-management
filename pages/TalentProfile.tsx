
import React, { useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Instagram, MapPin, Mail, Phone, CreditCard, Copy, Plus, ExternalLink,
  Image as ImageIcon, FileText, Calendar, CheckCircle2, Clock, ArrowLeft,
  Briefcase, X, DollarSign, AlertCircle, ShieldCheck, Download, Share2,
  ArrowUpRight, Edit3, Trash2, Save, Upload, Link as LinkIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, addDays } from 'date-fns';
import { it } from 'date-fns/locale';
import {
  Talent, Collaboration, Appointment, Campaign,
  AppointmentType, CollaborationStatus, PaymentStatus, Role, Attachment
} from '../types';
import { useApp } from '../context/AppContext';

interface TalentProfileProps {
  talents: Talent[];
  collaborations: Collaboration[];
  appointments: Appointment[];
  campaigns: Campaign[];
  addCollaboration: (collab: Omit<Collaboration, 'id'>, apps?: any[]) => Promise<Collaboration>;
  role: Role;
}

const formatFollowers = (count: number) => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  } else if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
};

const TalentProfile: React.FC<TalentProfileProps> = ({ talents, collaborations, appointments, campaigns, addCollaboration, role }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { updateTalent, deleteTalent, uploadTalentFile, updateCollaboration, showToast, isOnline } = useApp();
  const api = (window as any).api; // Access direct api for simple fetch or similar

  const talent = talents.find(t => t.id === id);
  const [showCollabModal, setShowCollabModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'collabs' | 'media' | 'admin'>('collabs');
  const [isSensitiveVisible, setIsSensitiveVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadType, setUploadType] = useState<'gallery' | 'attachments'>('gallery');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [credentials, setCredentials] = useState<{ username: string, email: string, password: string } | null>(null);
  const [isLoadingCreds, setIsLoadingCreds] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Talent>>({});

  // Form Nuova Collab
  const [collabForm, setCollabForm] = useState({
    brand: '',
    campaignId: campaigns[0]?.id || '',
    type: '',
    fee: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    deadline: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    notes: ''
  });

  const talentCollabs = useMemo(() =>
    collaborations.filter(c => c.talentId === talent?.id).reverse()
    , [collaborations, talent]);

  const talentApps = useMemo(() =>
    appointments.filter(a => a.talentId === talent?.id)
    , [appointments, talent]);

  if (!talent) return <div className="p-20 text-center font-black text-zinc-700 uppercase tracking-widest">Talent non trovato.</div>;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copiato negli appunti`, 'success');
  };

  const handleStartEdit = () => {
    setEditForm({
      firstName: talent.firstName,
      lastName: talent.lastName,
      stageName: talent.stageName,
      email: talent.email,
      phone: talent.phone,
      birthDate: talent.birthDate,
      instagram: talent.instagram,
      tiktok: talent.tiktok,
      address: talent.address,
      shippingNotes: talent.shippingNotes,
      iban: talent.iban,
      vat: talent.vat,
      taxNotes: talent.taxNotes,
      status: talent.status
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    try {
      await updateTalent(talent.id, editForm);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTalent(talent.id);
      navigate('/roster');
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      for (const file of Array.from(files) as File[]) {
        const url = await uploadTalentFile(talent.id, uploadType, file, {
          name: file.name,
          attachmentType: uploadType === 'attachments' ? 'document' : undefined
        });
        if (uploadType === 'photo') {
          setEditForm(prev => ({ ...prev, photoUrl: url }));
        }
      }
      setShowUploadModal(false);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleAddCollab = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedCampaign = campaigns.find(c => c.id === collabForm.campaignId);

    try {
      await addCollaboration(
        {
          talentId: talent.id,
          brand: collabForm.brand || selectedCampaign?.brand || 'Brand',
          campaignId: collabForm.campaignId,
          type: collabForm.type,
          fee: collabForm.fee,
          deadline: collabForm.deadline,
          status: CollaborationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.UNPAID,
          notes: collabForm.notes
        },
        [{
          talentId: talent.id,
          talentName: talent.stageName,
          brand: collabForm.brand || selectedCampaign?.brand || 'Brand',
          type: AppointmentType.SHOOTING,
          date: new Date(collabForm.date).toISOString(),
          status: 'planned',
          description: `Attività per ${selectedCampaign?.name || 'Campagna'}`
        }]
      );
      setShowCollabModal(false);
      setCollabForm({
        brand: '',
        campaignId: campaigns[0]?.id || '',
        type: '',
        fee: 0,
        date: format(new Date(), 'yyyy-MM-dd'),
        deadline: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        notes: ''
      });
    } catch (error) {
      console.error('Failed to add collab:', error);
    }
  };

  const handleTogglePayment = async (collabId: string, currentStatus: PaymentStatus) => {
    const newStatus = currentStatus === PaymentStatus.PAID ? PaymentStatus.UNPAID : PaymentStatus.PAID;
    try {
      await updateCollaboration(collabId, { paymentStatus: newStatus });
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  };

  const handleShareProfile = () => {
    const shareData = {
      title: `${talent.stageName} - Advenire Talent`,
      text: `Profilo talent: ${talent.stageName} (${talent.firstName} ${talent.lastName})`,
      url: window.location.href
    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      copyToClipboard(window.location.href, 'Link profilo');
    }
  };

  React.useEffect(() => {
    const fetchCreds = async () => {
      if (role === 'admin' && talent?.id) {
        setIsLoadingCreds(true);
        try {
          const res = await fetch(`http://localhost:3001/api/talents/${talent.id}/credentials`);
          if (res.ok) {
            const data = await res.json();
            setCredentials(data);
          }
        } catch (error) {
          console.error('Failed to fetch credentials:', error);
        } finally {
          setIsLoadingCreds(false);
        }
      }
    };
    fetchCreds();
  }, [role, talent?.id]);

  // Calculate total earnings
  const totalEarnings = talentCollabs.reduce((acc, c) => acc + c.fee, 0);
  const paidEarnings = talentCollabs.filter(c => c.paymentStatus === PaymentStatus.PAID).reduce((acc, c) => acc + c.fee, 0);
  const pendingEarnings = totalEarnings - paidEarnings;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto space-y-12 pb-32">
      {/* Header Curriculum */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex items-center space-x-6">
          <button onClick={() => navigate('/roster')} className="p-4 bg-zinc-900 border border-white/5 rounded-2xl text-zinc-500 hover:text-white transition-all"><ArrowLeft size={24} /></button>
          <div>
            <div className="flex items-center space-x-3 mb-1">
              <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-[0.2em] ${talent.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                {talent.status === 'active' ? '● Agente Attivo' : '○ Non Attivo'}
              </span>
              <span className="text-zinc-700 font-bold">•</span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">ID: {talent.id}</span>
            </div>
            {isEditing ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-2xl font-black text-white uppercase w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editForm.firstName || ''}
                    placeholder="Nome"
                    onChange={e => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                  />
                  <input
                    className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-2xl font-black text-white uppercase w-full focus:ring-2 focus:ring-blue-500 outline-none"
                    value={editForm.lastName || ''}
                    placeholder="Cognome"
                    onChange={e => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
                <input
                  className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-zinc-400 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                  value={editForm.stageName || ''}
                  placeholder="Nome d'arte"
                  onChange={e => setEditForm(prev => ({ ...prev, stageName: e.target.value }))}
                />
              </div>
            ) : (
              <>
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">{talent.stageName}</h1>
                <p className="text-zinc-500 font-bold text-sm mt-2">{talent.firstName} {talent.lastName} — Curriculum Operativo</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="flex items-center space-x-2 bg-zinc-900 px-6 py-4 rounded-2xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all">
                <X size={16} />
                <span>Annulla</span>
              </button>
              <button onClick={handleSaveEdit} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest text-white transition-all">
                <Save size={16} />
                <span>Salva Modifiche</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={handleShareProfile} className="flex items-center space-x-2 bg-zinc-900 px-6 py-4 rounded-2xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all">
                <Share2 size={16} />
                <span>Condividi Profilo</span>
              </button>
              <button onClick={handleStartEdit} className="flex items-center space-x-2 bg-zinc-900 px-6 py-4 rounded-2xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all">
                <Edit3 size={16} />
                <span>Modifica</span>
              </button>
              <button onClick={() => setShowCollabModal(true)} className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95">
                <Plus size={20} />
                <span>Nuova Collaborazione</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Collaborazioni</p>
          <p className="text-3xl font-black text-white">{talentCollabs.length}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Totale Fee</p>
          <p className="text-3xl font-black text-blue-500">€{totalEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Incassato</p>
          <p className="text-3xl font-black text-emerald-500">€{paidEarnings.toLocaleString()}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Pendente</p>
          <p className="text-3xl font-black text-amber-500">€{pendingEarnings.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Colonna Sinistra: Anagrafica & Info Rapide */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-[#0c0c0c] border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl relative">
            <div className="aspect-[3/4] relative group">
              <img src={isEditing ? (editForm.photoUrl || talent.photoUrl) : talent.photoUrl} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />

              {isEditing && (
                <button
                  onClick={() => { setUploadType('photo'); setShowUploadModal(true); }}
                  className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Upload size={32} />
                  <span className="text-[10px] font-black uppercase mt-2">Cambia Foto</span>
                </button>
              )}

              <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Social Hub</p>
                  <div className="flex space-x-3">
                    {(isEditing ? editForm.instagram : talent.instagram) && (
                      <button onClick={() => window.open(isEditing ? editForm.instagram : talent.instagram, '_blank')} className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-white hover:bg-pink-600 transition-all">
                        <Instagram size={18} />
                      </button>
                    )}
                    {(isEditing ? editForm.tiktok : talent.tiktok) && (
                      <button onClick={() => window.open(isEditing ? editForm.tiktok : talent.tiktok, '_blank')} className="w-10 h-10 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center text-white hover:bg-black transition-all group-tiktok">
                        <img src="http://localhost:3001/uploads/tiktoklogo_white.png" alt="TikTok" className="w-5 h-5 object-contain" />
                      </button>
                    )}
                  </div>
                  {/* Follower Stats Display */}
                  <div className="mt-2 space-y-1">
                    {talent.instagramFollowers && (
                      <div className="flex items-center space-x-1">
                        <Instagram size={10} className="text-zinc-400" />
                        <span className="text-[10px] text-white font-bold">{formatFollowers(talent.instagramFollowers)}</span>
                      </div>
                    )}
                    {talent.tiktokFollowers && (
                      <div className="flex items-center space-x-1">
                        <img src="http://localhost:3001/uploads/tiktoklogo_grey.png" alt="TK" className="w-2.5 h-2.5 object-contain opacity-60" />
                        <span className="text-[10px] text-white font-bold">{formatFollowers(talent.tiktokFollowers)}</span>
                      </div>
                    )}
                  </div>
                </div>
                {!isEditing && (
                  <button onClick={() => copyToClipboard(`${talent.instagram}\n${talent.tiktok}`, 'Social')} className="p-3 bg-white/5 backdrop-blur-md rounded-xl text-white/50 hover:text-white transition-all">
                    <Copy size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="p-8 space-y-6">
              {isEditing && (
                <div className="space-y-4 pt-2 pb-2">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">Instagram URL</label>
                    <input
                      type="url"
                      value={editForm.instagram || ''}
                      onChange={e => setEditForm({ ...editForm, instagram: e.target.value })}
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="https://instagram.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">TikTok URL</label>
                    <input
                      type="url"
                      value={editForm.tiktok || ''}
                      onChange={e => setEditForm({ ...editForm, tiktok: e.target.value })}
                      className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                      placeholder="https://tiktok.com/@..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">IG Follower</label>
                      <input
                        type="number"
                        value={editForm.instagramFollowers || ''}
                        onChange={e => setEditForm({ ...editForm, instagramFollowers: parseInt(e.target.value) || 0 })}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-zinc-600 uppercase tracking-widest ml-1">TikTok Follower</label>
                      <input
                        type="number"
                        value={editForm.tiktokFollowers || ''}
                        onChange={e => setEditForm({ ...editForm, tiktokFollowers: parseInt(e.target.value) || 0 })}
                        className="w-full bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-xs text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
                  <Mail className="text-zinc-600" size={18} />
                  <span className="text-xs font-bold text-zinc-300 truncate flex-1">{isEditing ? (
                    <input
                      type="email"
                      value={editForm.email || ''}
                      onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                      className="bg-transparent border-none w-full focus:outline-none"
                    />
                  ) : talent.email}</span>
                  {!isEditing && (
                    <button onClick={() => copyToClipboard(talent.email, 'Email')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Copy size={14} className="text-zinc-600 hover:text-white" />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
                  <Phone className="text-zinc-600" size={18} />
                  <span className="text-xs font-bold text-zinc-300 flex-1">{isEditing ? (
                    <input
                      type="tel"
                      value={editForm.phone || ''}
                      onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      className="bg-transparent border-none w-full focus:outline-none"
                    />
                  ) : talent.phone || 'Non specificato'}</span>
                  {!isEditing && talent.phone && (
                    <button onClick={() => copyToClipboard(talent.phone, 'Telefono')} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Copy size={14} className="text-zinc-600 hover:text-white" />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-4 p-4 bg-zinc-900/50 rounded-2xl border border-white/5 group hover:border-blue-500/30 transition-all">
                  <Calendar className="text-zinc-600" size={18} />
                  <span className="text-xs font-bold text-zinc-300 flex-1">{isEditing ? (
                    <input
                      type="date"
                      value={editForm.birthDate || ''}
                      onChange={e => setEditForm({ ...editForm, birthDate: e.target.value })}
                      className="bg-transparent border-none w-full focus:outline-none"
                    />
                  ) : talent.birthDate ? format(parseISO(talent.birthDate), 'dd MMMM yyyy', { locale: it }) : 'Data non specificata'}</span>
                </div>
              </div>

              {/* Spedizioni */}
              <div className="pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Dati Spedizione</h3>
                  {!isEditing && talent.address && (
                    <button onClick={() => copyToClipboard(talent.address, 'Indirizzo')} className="text-blue-500 hover:text-white transition-colors">
                      <Copy size={14} />
                    </button>
                  )}
                </div>
                <div className="p-5 bg-black rounded-2xl border border-white/5">
                  {isEditing ? (
                    <textarea
                      value={editForm.address || ''}
                      onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                      className="bg-transparent border-none w-full text-xs font-bold text-zinc-300 resize-none focus:outline-none"
                      rows={2}
                      placeholder="Indirizzo completo..."
                    />
                  ) : (
                    <p className="text-xs font-bold text-zinc-300 leading-relaxed mb-3">{talent.address || 'Indirizzo non specificato'}</p>
                  )}
                  <div className="flex items-start space-x-3 text-[10px] text-zinc-500 italic">
                    <AlertCircle size={14} className="shrink-0 text-zinc-700" />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.shippingNotes || ''}
                        onChange={e => setEditForm({ ...editForm, shippingNotes: e.target.value })}
                        className="bg-transparent border-none w-full focus:outline-none"
                        placeholder="Note spedizione..."
                      />
                    ) : (
                      <p>{talent.shippingNotes || 'Nessuna nota'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dati Fiscali Protetti */}
          {(role === 'admin' || role === 'finance') && (
            <div className="bg-[#0c0c0c] border border-white/5 p-8 rounded-[2.5rem] shadow-2xl space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center">
                  <ShieldCheck size={16} className="mr-2" />
                  Amministrazione
                </h3>
                <button
                  onClick={() => setIsSensitiveVisible(!isSensitiveVisible)}
                  className="text-[10px] font-black text-zinc-600 uppercase hover:text-white"
                >
                  {isSensitiveVisible ? 'Nascondi' : 'Mostra'}
                </button>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-black rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">IBAN</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.iban || ''}
                      onChange={e => setEditForm({ ...editForm, iban: e.target.value })}
                      className="bg-transparent border-none w-full font-mono text-[10px] tracking-widest text-zinc-300 focus:outline-none"
                      placeholder="IT..."
                    />
                  ) : (
                    <p className={`font-mono text-[10px] tracking-widest ${isSensitiveVisible ? 'text-zinc-300' : 'text-zinc-800'}`}>
                      {isSensitiveVisible ? (talent.iban || 'Non specificato') : '••••••••••••••••••••••••••••'}
                    </p>
                  )}
                </div>
                <div className="p-4 bg-black rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Partita IVA / CF</p>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.vat || ''}
                      onChange={e => setEditForm({ ...editForm, vat: e.target.value })}
                      className="bg-transparent border-none w-full font-mono text-[10px] tracking-widest text-zinc-300 focus:outline-none"
                      placeholder="IT..."
                    />
                  ) : (
                    <p className={`font-mono text-[10px] tracking-widest ${isSensitiveVisible ? 'text-zinc-300' : 'text-zinc-800'}`}>
                      {isSensitiveVisible ? (talent.vat || 'Non specificato') : '•••••••••••'}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-black rounded-2xl border border-white/5">
                  <p className="text-[9px] font-black text-zinc-600 uppercase mb-1">Metodi di Pagamento / Note Fiscali</p>
                  {isEditing ? (
                    <textarea
                      value={editForm.taxNotes || ''}
                      onChange={e => setEditForm({ ...editForm, taxNotes: e.target.value })}
                      className="bg-transparent border-none w-full font-mono text-[10px] text-zinc-300 focus:outline-none resize-none"
                      rows={3}
                      placeholder="IBAN, PayPal, Revolut, Note fiscali..."
                    />
                  ) : (
                    <p className={`font-mono text-[10px] tracking-tight ${isSensitiveVisible ? 'text-zinc-400' : 'text-zinc-800'}`}>
                      {isSensitiveVisible ? (talent.taxNotes || 'Nessuna nota aggiuntiva') : '••••••••••••••••'}
                    </p>
                  )}
                </div>

                {/* Login Credentials Section */}
                <div className="pt-6 border-t border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Credenziali Accesso Talent</h4>
                  <div className="p-4 bg-zinc-900/50 rounded-2xl border border-white/5 space-y-3">
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Username</p>
                      <div className="flex items-center justify-between">
                        <p className={`font-mono text-[10px] ${isSensitiveVisible ? 'text-white' : 'text-zinc-800'}`}>
                          {isSensitiveVisible ? (credentials?.username || 'Caricamento...') : '••••••••••••'}
                        </p>
                        {isSensitiveVisible && credentials && (
                          <button onClick={() => copyToClipboard(credentials.username, 'Username')} className="text-zinc-600 hover:text-white">
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-zinc-600 uppercase mb-1">Password</p>
                      <div className="flex items-center justify-between">
                        <p className={`font-mono text-[10px] ${isSensitiveVisible ? 'text-white' : 'text-zinc-800'}`}>
                          {isSensitiveVisible ? (credentials?.password || 'Caricamento...') : '••••••••••••'}
                        </p>
                        {isSensitiveVisible && credentials && (
                          <button onClick={() => copyToClipboard(credentials.password, 'Password')} className="text-zinc-600 hover:text-white">
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Delete Button */}
              {role === 'admin' && !isEditing && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full mt-4 flex items-center justify-center space-x-2 p-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-2xl text-red-500 font-black uppercase text-[10px] tracking-widest transition-all"
                >
                  <Trash2 size={16} />
                  <span>Elimina Talent</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Colonna Destra: Tabs Operativi */}
        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center space-x-3 p-2 bg-zinc-900/40 rounded-[1.8rem] border border-white/5 w-fit">
            {(['collabs', 'media', 'admin'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-xl' : 'text-zinc-500 hover:text-white'}`}
              >
                {tab === 'collabs' ? 'Storico Collab' : tab === 'media' ? 'Asset & Media' : 'Calendario'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'collabs' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                {talentCollabs.length > 0 ? talentCollabs.map(col => {
                  const campaign = campaigns.find(cp => cp.id === col.campaignId);
                  return (
                    <div key={col.id} className="bg-[#0c0c0c] border border-white/5 p-8 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-blue-500/30 transition-all shadow-xl group">
                      <div className="flex items-center space-x-6">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${col.status === CollaborationStatus.COMPLETED ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                          }`}>
                          <Briefcase size={28} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">{campaign?.name} — {col.type}</p>
                          <h4 className="text-2xl font-black text-white uppercase tracking-tighter group-hover:text-blue-500 transition-colors">{col.brand}</h4>
                          <div className="flex items-center space-x-3 mt-2">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase">{col.status}</span>
                            <span className="text-zinc-800">•</span>
                            <button
                              onClick={() => handleTogglePayment(col.id, col.paymentStatus)}
                              className={`text-[10px] font-bold uppercase px-3 py-1 rounded-lg transition-all ${col.paymentStatus === PaymentStatus.PAID
                                ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                }`}
                            >
                              {col.paymentStatus === PaymentStatus.PAID ? '✓ Saldato' : '○ Non Saldato'}
                            </button>
                            {col.deadline && (
                              <>
                                <span className="text-zinc-800">•</span>
                                <span className="text-[10px] font-bold text-zinc-600 flex items-center">
                                  <Clock size={12} className="mr-1" />
                                  Scadenza: {format(parseISO(col.deadline), 'dd MMM', { locale: it })}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Talent Fee</p>
                        <p className="text-3xl font-black text-white tracking-tighter">€{col.fee.toLocaleString()}</p>
                        <button
                          onClick={() => navigate('/campaigns')}
                          className="mt-3 text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center ml-auto hover:text-white"
                        >
                          Vedi Campagna <ArrowUpRight size={14} className="ml-1" />
                        </button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-20 text-center opacity-30">
                    <Briefcase size={64} className="mx-auto text-zinc-700 mb-6" />
                    <p className="text-xl font-black uppercase tracking-widest">Nessuna collaborazione registrata</p>
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'media' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-10">
                {/* Gallery */}
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Gallery Foto</h3>
                    <button
                      onClick={() => { setUploadType('gallery'); setShowUploadModal(true); }}
                      className="flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white"
                    >
                      <Plus size={14} />
                      <span>Aggiungi</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {talent.gallery.map((img, i) => (
                      <div key={i} className="aspect-square rounded-3xl overflow-hidden border border-white/5 relative group cursor-pointer">
                        <img src={img} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                        <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                          <a href={img} download className="p-3 bg-black/50 rounded-xl">
                            <Download size={20} className="text-white" />
                          </a>
                          <button onClick={() => window.open(img, '_blank')} className="p-3 bg-black/50 rounded-xl">
                            <ExternalLink size={20} className="text-white" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => { setUploadType('gallery'); setShowUploadModal(true); }}
                      className="aspect-square rounded-3xl border-4 border-dashed border-white/5 flex flex-col items-center justify-center text-zinc-700 hover:text-blue-500 hover:border-blue-500/30 transition-all space-y-3"
                    >
                      <Plus size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Aggiungi Foto</span>
                    </button>
                  </div>
                </div>

                {/* Allegati */}
                <div className="bg-zinc-950 p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.3em]">Allegati & Kit Operativi</h3>
                    <button
                      onClick={() => { setUploadType('attachments'); setShowUploadModal(true); }}
                      className="flex items-center space-x-2 text-[10px] font-black text-blue-500 uppercase tracking-widest hover:text-white"
                    >
                      <Plus size={14} />
                      <span>Upload</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {talent.attachments?.map(att => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-2xl border border-white/5 group hover:border-blue-500/50 transition-all cursor-pointer"
                      >
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-500 group-hover:text-blue-500"><FileText size={20} /></div>
                          <div>
                            <p className="text-xs font-black text-white uppercase tracking-tight">{att.name}</p>
                            <p className="text-[9px] font-bold text-zinc-600 uppercase">{att.type} • {att.size}</p>
                          </div>
                        </div>
                        <Download size={18} className="text-zinc-700 group-hover:text-white" />
                      </a>
                    ))}
                    {(!talent.attachments || talent.attachments.length === 0) && (
                      <div className="col-span-2 py-10 text-center text-zinc-600">
                        <FileText size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">Nessun allegato</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'admin' && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <h3 className="text-lg font-black text-white uppercase tracking-tight">Appuntamenti & Scadenze</h3>
                {talentApps.length > 0 ? talentApps.map(app => (
                  <div key={app.id} className="bg-[#0c0c0c] border border-white/5 p-6 rounded-[2rem] flex items-center justify-between hover:border-blue-500/30 transition-all">
                    <div className="flex items-center space-x-6">
                      <div className="w-16 h-16 rounded-2xl bg-zinc-900 flex flex-col items-center justify-center border border-white/10">
                        <span className="text-[10px] font-black text-blue-500 uppercase">{format(new Date(app.date), 'MMM', { locale: it })}</span>
                        <span className="text-2xl font-black text-white">{format(new Date(app.date), 'dd')}</span>
                      </div>
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest mb-2 ${app.type === AppointmentType.SHOOTING ? 'bg-purple-500/10 text-purple-500' :
                          app.type === AppointmentType.PUBLICATION ? 'bg-blue-500/10 text-blue-500' :
                            'bg-zinc-800 text-zinc-400'
                          }`}>
                          {app.type}
                        </span>
                        <h4 className="text-lg font-black text-white uppercase tracking-tight">{app.brand}</h4>
                        <p className="text-xs text-zinc-500">{app.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${app.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        app.status === 'cancelled' ? 'bg-red-500/10 text-red-500' :
                          'bg-blue-500/10 text-blue-500'
                        }`}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                )) : (
                  <div className="py-20 text-center opacity-30">
                    <Calendar size={64} className="mx-auto text-zinc-700 mb-6" />
                    <p className="text-xl font-black uppercase tracking-widest">Nessun appuntamento</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Nuova Collaborazione */}
      <AnimatePresence>
        {showCollabModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCollabModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-[3rem] w-full max-w-2xl shadow-3xl overflow-hidden p-12">
              <div className="flex justify-between items-center mb-10">
                <div>
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Nuova Collab</h3>
                  <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">Talent: {talent.stageName}</p>
                </div>
                <button onClick={() => setShowCollabModal(false)} className="p-3 hover:bg-zinc-900 rounded-2xl transition-all text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>

              <form className="grid grid-cols-2 gap-8" onSubmit={handleAddCollab}>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Brand / Cliente</label>
                  <input type="text" required className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="es. Netflix" value={collabForm.brand} onChange={e => setCollabForm({ ...collabForm, brand: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Campagna Advenire</label>
                  <select className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none" value={collabForm.campaignId} onChange={e => setCollabForm({ ...collabForm, campaignId: e.target.value })}>
                    {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Tipologia</label>
                  <input type="text" required className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" placeholder="es. 1 Reel + 3 IG Stories" value={collabForm.type} onChange={e => setCollabForm({ ...collabForm, type: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Fee Talent (€)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                    <input type="number" required className="w-full bg-zinc-900 border border-white/5 rounded-2xl pl-12 pr-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" value={collabForm.fee} onChange={e => setCollabForm({ ...collabForm, fee: Number(e.target.value) })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Data Attività</label>
                  <input type="date" required className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" value={collabForm.date} onChange={e => setCollabForm({ ...collabForm, date: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Scadenza Consegna</label>
                  <input type="date" required className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none" value={collabForm.deadline} onChange={e => setCollabForm({ ...collabForm, deadline: e.target.value })} />
                </div>
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-widest ml-1">Note (opzionale)</label>
                  <textarea className="w-full bg-zinc-900 border border-white/5 rounded-2xl px-6 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" rows={2} placeholder="Note operative..." value={collabForm.notes} onChange={e => setCollabForm({ ...collabForm, notes: e.target.value })} />
                </div>
                <button type="submit" className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-6 rounded-3xl transition-all shadow-2xl shadow-blue-500/30 mt-4 active:scale-95">Inizializza Collaborazione & Sincronizza Calendario</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowUploadModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-[3rem] w-full max-w-md shadow-3xl overflow-hidden p-12">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {uploadType === 'gallery' ? 'Carica Foto' : 'Carica Documento'}
                </h3>
                <button onClick={() => setShowUploadModal(false)} className="p-3 hover:bg-zinc-900 rounded-2xl transition-all text-zinc-500 hover:text-white"><X size={24} /></button>
              </div>

              <div className="space-y-6">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-white/10 rounded-3xl p-12 text-center cursor-pointer hover:border-blue-500/50 transition-all"
                >
                  <Upload size={48} className="mx-auto text-zinc-600 mb-4" />
                  <p className="text-sm font-bold text-zinc-400">Clicca o trascina file qui</p>
                  <p className="text-[10px] text-zinc-600 mt-2">
                    {(uploadType === 'gallery' || uploadType === 'photo') ? 'JPG, JPEG, PNG, WebP (max 10MB)' : 'PDF, DOC, XLS (max 50MB)'}
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={(uploadType === 'gallery' || uploadType === 'photo') ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx'}
                  multiple={uploadType !== 'photo'}
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {!isOnline && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                    <p className="text-xs font-bold text-amber-500">Upload non disponibile in modalità offline</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0c0c0c] border border-red-500/20 rounded-[2rem] w-full max-w-md shadow-3xl overflow-hidden p-10 text-center">
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-3">Elimina Talent</h3>
              <p className="text-zinc-500 mb-8">Sei sicuro di voler eliminare <span className="text-white font-bold">{talent.stageName}</span>? Questa azione è irreversibile.</p>
              <div className="flex space-x-4">
                <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-zinc-900 hover:bg-zinc-800 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-zinc-400 transition-all">
                  Annulla
                </button>
                <button onClick={handleDelete} className="flex-1 bg-red-600 hover:bg-red-700 py-4 rounded-2xl font-black uppercase text-xs tracking-widest text-white transition-all">
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
