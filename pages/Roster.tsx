
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, Plus, Instagram, MoreHorizontal, UserPlus, X, Image as ImageIcon, Trash2, Edit3, Check, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Talent, Attachment } from '../types';

interface RosterProps {
  talents: Talent[];
  addTalent: (t: Omit<Talent, 'id'>) => Promise<any>;
  importTalentsCSV: (file: File) => Promise<any>;
}

const Roster: React.FC<RosterProps> = ({ talents, addTalent, importTalentsCSV }) => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const filteredTalents = talents.filter(t => {
    const matchSearch = t.stageName.toLowerCase().includes(search.toLowerCase()) ||
      t.firstName.toLowerCase().includes(search.toLowerCase()) ||
      t.lastName.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const [newTalent, setNewTalent] = useState({
    firstName: '',
    lastName: '',
    stageName: '',
    email: '',
    phone: '',
    birthDate: '',
    instagram: '',
    tiktok: '',
    address: '',
    shippingNotes: '',
    iban: '',
    vat: '',
    taxNotes: '',
    photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
  });

  const [createdUserCredentials, setCreatedUserCredentials] = useState<{ email: string, password: string } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const result = await addTalent({
        ...newTalent,
        status: 'active',
        gallery: [],
        attachments: []
      } as Omit<Talent, 'id'>);

      setShowAddModal(false);

      if (result.credentials) {
        setCreatedUserCredentials(result.credentials);
      }

      setNewTalent({
        firstName: '',
        lastName: '',
        stageName: '',
        email: '',
        phone: '',
        birthDate: '',
        instagram: '',
        tiktok: '',
        address: '',
        shippingNotes: '',
        iban: '',
        vat: '',
        taxNotes: '',
        photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'
      });
    } catch (error) {
      console.error('Failed to add talent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      await importTalentsCSV(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Roster Advenire</h1>
          <p className="text-zinc-500 font-medium text-lg">I migliori talent per le migliori campagne. Gestione centralizzata.</p>
        </div>
        <div className="flex items-center space-x-4">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            disabled={isImporting}
            className="flex items-center space-x-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-6 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all border border-white/5 active:scale-95 disabled:opacity-50"
          >
            {isImporting ? <Loader2 size={20} className="animate-spin" /> : <FileText size={20} />}
            <span>Importa CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95"
          >
            <UserPlus size={20} />
            <span>Nuovo Talent</span>
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-900/40 p-3 rounded-3xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center bg-zinc-800/80 rounded-2xl px-5 py-3 w-full lg:w-[500px] border border-white/5 focus-within:border-blue-500/50 transition-all">
          <Search size={18} className="text-zinc-500 mr-3" />
          <input
            type="text"
            placeholder="Filtra per nome, alias o email..."
            className="bg-transparent border-none text-sm focus:ring-0 text-zinc-200 placeholder-zinc-600 w-full font-bold outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2 bg-zinc-800/50 p-1.5 rounded-2xl border border-white/5">
            {(['all', 'active', 'inactive'] as const).map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-zinc-500 hover:text-white'
                  }`}
              >
                {status === 'all' ? 'Tutti' : status === 'active' ? 'Attivi' : 'Inattivi'}
              </button>
            ))}
          </div>

          {/* View Toggle */}
          <div className="flex items-center space-x-3 bg-zinc-800/50 p-1.5 rounded-2xl border border-white/5">
            <button
              onClick={() => setView('grid')}
              className={`p-3 rounded-xl transition-all ${view === 'grid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
            >
              <Grid size={20} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-3 rounded-xl transition-all ${view === 'list' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-zinc-500 hover:text-white'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Totale Roster</p>
          <p className="text-3xl font-black text-white">{talents.length}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Talent Attivi</p>
          <p className="text-3xl font-black text-emerald-500">{talents.filter(t => t.status === 'active').length}</p>
        </div>
        <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5">
          <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Visualizzati</p>
          <p className="text-3xl font-black text-blue-500">{filteredTalents.length}</p>
        </div>
      </div>

      <AnimatePresence mode="popLayout">
        {view === 'grid' ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          >
            {filteredTalents.map((talent, idx) => (
              <motion.div
                layoutId={talent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                key={talent.id}
                onClick={() => navigate(`/roster/${talent.id}`)}
                className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:border-blue-500/50 hover:shadow-[0_32px_64px_-16px_rgba(59,130,246,0.15)] transition-all duration-500"
              >
                <div className="aspect-[3/4] overflow-hidden relative">
                  <img
                    src={talent.photoUrl}
                    alt={talent.stageName}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute top-6 right-6">
                    <span className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-2xl ${talent.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                      {talent.status === 'active' ? '● Attivo' : '● Inattivo'}
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/90 via-black/40 to-transparent">
                    <h3 className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-tighter leading-none">{talent.stageName}</h3>
                    <p className="text-sm text-zinc-400 font-bold mt-1">{talent.firstName} {talent.lastName}</p>
                  </div>
                </div>
                <div className="p-6 flex items-center justify-between bg-zinc-900/20 backdrop-blur-sm">
                  <div className="flex space-x-4">
                    {talent.instagram && <Instagram size={18} className="text-zinc-600 group-hover:text-pink-500 transition-colors" />}
                    {talent.tiktok && (
                      <div className="relative w-8 h-4">
                        <img
                          src="http://localhost:3001/uploads/tiktoklogo_grey.png"
                          alt="TikTok"
                          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0"
                        />
                        <img
                          src="http://localhost:3001/uploads/tiktoklogo_white.png"
                          alt="TikTok"
                          className="absolute inset-0 w-full h-full object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                        />
                      </div>
                    )}
                  </div>
                  <MoreHorizontal size={20} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-900/40 border-b border-white/5 text-[9px] font-black text-zinc-500 uppercase tracking-[0.3em]">
                  <th className="px-10 py-6">ID & Talent</th>
                  <th className="px-10 py-6">Canali Social</th>
                  <th className="px-10 py-6">Email Di Contatto</th>
                  <th className="px-10 py-6 text-center">Status</th>
                  <th className="px-10 py-6 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredTalents.map((talent) => (
                  <tr
                    key={talent.id}
                    onClick={() => navigate(`/roster/${talent.id}`)}
                    className="hover:bg-zinc-900/20 cursor-pointer transition-all group"
                  >
                    <td className="px-10 py-6">
                      <div className="flex items-center space-x-5">
                        <div className="w-14 h-14 rounded-2xl bg-zinc-800 border border-white/10 overflow-hidden shrink-0 group-hover:scale-95 transition-transform">
                          <img src={talent.photoUrl} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div>
                          <p className="font-black text-white uppercase text-lg tracking-tighter leading-tight">{talent.stageName}</p>
                          <p className="text-xs text-zinc-500 font-bold">{talent.firstName} {talent.lastName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-10 py-6">
                      <div className="flex items-center space-x-3">
                        {talent.instagram && (
                          <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                            <Instagram size={14} />
                          </div>
                        )}
                        {talent.tiktok && (
                          <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center relative group-hover:bg-zinc-700 transition-colors">
                            <img
                              src="http://localhost:3001/uploads/tiktoklogo_grey.png"
                              alt="TikTok"
                              className="absolute w-4 h-4 object-contain transition-opacity duration-300 opacity-100 group-hover:opacity-0"
                            />
                            <img
                              src="http://localhost:3001/uploads/tiktoklogo_white.png"
                              alt="TikTok"
                              className="absolute w-4 h-4 object-contain transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-10 py-6 text-zinc-400 text-sm font-bold">{talent.email}</td>
                    <td className="px-10 py-6 text-center">
                      <span className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest ${talent.status === 'active' ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
                        }`}>
                        {talent.status}
                      </span>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/roster/${talent.id}`);
                        }}
                        className="p-3 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-600 hover:text-white"
                      >
                        <MoreHorizontal size={20} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-lg"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-3xl shadow-3xl overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="p-10 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Nuovo Talent</h3>
                  <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white p-3 hover:bg-zinc-800 rounded-2xl transition-all">
                    <X size={24} />
                  </button>
                </div>

                <form className="space-y-8" onSubmit={handleAdd}>
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Dati Anagrafici</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome d'arte *</label>
                        <input
                          type="text" required
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          placeholder="es. MarkRed"
                          value={newTalent.stageName}
                          onChange={e => setNewTalent({ ...newTalent, stageName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email Ufficiale *</label>
                        <input
                          type="email" required
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          placeholder="talent@advenire.it"
                          value={newTalent.email}
                          onChange={e => setNewTalent({ ...newTalent, email: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome *</label>
                        <input
                          type="text" required
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          value={newTalent.firstName}
                          onChange={e => setNewTalent({ ...newTalent, firstName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Cognome *</label>
                        <input
                          type="text" required
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          value={newTalent.lastName}
                          onChange={e => setNewTalent({ ...newTalent, lastName: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Telefono</label>
                        <input
                          type="tel"
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          placeholder="+39 333 1234567"
                          value={newTalent.phone}
                          onChange={e => setNewTalent({ ...newTalent, phone: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Data di Nascita</label>
                        <input
                          type="date"
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          value={newTalent.birthDate}
                          onChange={e => setNewTalent({ ...newTalent, birthDate: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Social Media */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Social Media</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Instagram</label>
                        <input
                          type="url"
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          placeholder="https://instagram.com/..."
                          value={newTalent.instagram}
                          onChange={e => setNewTalent({ ...newTalent, instagram: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">TikTok</label>
                        <input
                          type="url"
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          placeholder="https://tiktok.com/@..."
                          value={newTalent.tiktok}
                          onChange={e => setNewTalent({ ...newTalent, tiktok: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Dati Spedizione</h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Indirizzo Completo</label>
                        <input
                          type="text"
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          placeholder="Via Roma 12, 20121 Milano (MI)"
                          value={newTalent.address}
                          onChange={e => setNewTalent({ ...newTalent, address: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Note Spedizione</label>
                        <textarea
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                          placeholder="Citofono, piano, orari preferiti..."
                          rows={2}
                          value={newTalent.shippingNotes}
                          onChange={e => setNewTalent({ ...newTalent, shippingNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Administration */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Dati Amministrativi</h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">IBAN</label>
                        <input
                          type="text"
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          placeholder="IT..."
                          value={newTalent.iban}
                          onChange={e => setNewTalent({ ...newTalent, iban: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Partita IVA / CF</label>
                        <input
                          type="text"
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                          placeholder="12345678901"
                          value={newTalent.vat}
                          onChange={e => setNewTalent({ ...newTalent, vat: e.target.value })}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Metodi di Pagamento / Note Fiscali</label>
                        <textarea
                          className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all resize-none"
                          placeholder="IBAN, PayPal, Revolut, Note varie..."
                          rows={2}
                          value={newTalent.taxNotes}
                          onChange={e => setNewTalent({ ...newTalent, taxNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] border-b border-white/5 pb-2">Foto Profilo</h4>
                    <div className="flex space-x-4">
                      <div className="flex-1 bg-black border border-white/10 rounded-2xl px-5 py-4 flex items-center">
                        <ImageIcon size={18} className="text-zinc-500 mr-3" />
                        <input
                          type="url"
                          className="bg-transparent border-none text-white font-bold focus:ring-0 w-full outline-none"
                          placeholder="URL immagine"
                          value={newTalent.photoUrl}
                          onChange={e => setNewTalent({ ...newTalent, photoUrl: e.target.value })}
                        />
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-zinc-800 overflow-hidden border border-white/10">
                        <img src={newTalent.photoUrl} className="w-full h-full object-cover" alt="Preview" />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="col-span-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-black uppercase text-xs tracking-[0.2em] py-5 rounded-2xl transition-all shadow-2xl shadow-blue-500/30 mt-4 active:scale-95"
                  >
                    {isSubmitting ? 'Creazione in corso...' : 'Crea Profilo Talent'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credentials Modal */}
      <AnimatePresence>
        {createdUserCredentials && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-lg"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              className="relative bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-lg shadow-3xl overflow-hidden p-10 text-center"
            >
              <div className="flex flex-col items-center space-y-6">
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500 mb-2">
                  <Check size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Talent Creato con Successo</h3>
                  <p className="text-zinc-500 font-medium mt-2">Ecco le credenziali di accesso per il talent. Condividile ora, non saranno più visibili.</p>
                </div>

                <div className="w-full bg-black/50 rounded-2xl p-6 border border-white/5 space-y-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Email</p>
                    <p className="text-lg font-bold text-white select-all">{createdUserCredentials.email}</p>
                  </div>
                  <div className="w-full h-px bg-white/5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Password</p>
                    <p className="text-lg font-bold text-white select-all font-mono tracking-widest">{createdUserCredentials.password}</p>
                  </div>
                </div>

                <button
                  onClick={() => setCreatedUserCredentials(null)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-[0.2em] py-4 rounded-xl transition-all shadow-xl shadow-blue-500/20"
                >
                  Ho Copiato le Credenziali
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Roster;
