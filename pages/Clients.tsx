
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, X, Save, Edit3, Trash2, Building2, ArrowLeft,
  Phone, Mail, User, ChevronRight, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client, Campaign } from '../types';
import { useApp } from '../context/AppContext';

const Clients: React.FC = () => {
  const { clients, campaigns, campaignTalents, addClient, updateClient, deleteClient, showToast } = useApp();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('ALL');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Client>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New client form
  const emptyForm: Partial<Client> = { tipo: '', ragione_sociale: '', referente: '', email: '', telefono: '', note: '' };
  const [newClient, setNewClient] = useState(emptyForm);

  // Get unique tipos for filter
  const tipos = useMemo(() => {
    const set = new Set(clients.map(c => c.tipo).filter(Boolean));
    return Array.from(set) as string[];
  }, [clients]);

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const q = search.toLowerCase();
      const matchSearch = !q ||
        c.ragione_sociale.toLowerCase().includes(q) ||
        (c.referente && c.referente.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q));
      const matchTipo = tipoFilter === 'ALL' || c.tipo === tipoFilter;
      return matchSearch && matchTipo;
    });
  }, [clients, search, tipoFilter]);

  // Campaigns for selected client
  const clientCampaigns = useMemo(() => {
    if (!selectedClient) return [];
    return campaigns.filter(c => c.client_id === selectedClient.id);
  }, [campaigns, selectedClient]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.ragione_sociale) return;
    setIsSubmitting(true);
    try {
      const created = await addClient(newClient as Omit<Client, 'id'>);
      setShowAddModal(false);
      setNewClient(emptyForm);
      setSelectedClient(created);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = () => {
    if (!selectedClient) return;
    setEditForm({ ...selectedClient });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedClient) return;
    try {
      const updated = await updateClient(selectedClient.id, editForm);
      setSelectedClient(updated);
      setIsEditing(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    try {
      await deleteClient(selectedClient.id);
      setSelectedClient(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error(err);
    }
  };

  // Detail view
  if (selectedClient) {
    const Field: React.FC<{ label: string; value?: string; field: string; type?: string }> = ({
      label, value, field, type = 'text'
    }) => (
      <div>
        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">{label}</label>
        {isEditing ? (
          <input
            type={type}
            value={(editForm as any)[field] || ''}
            onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
          />
        ) : (
          <p className="text-sm text-white font-medium py-2">{value || '—'}</p>
        )}
      </div>
    );

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => { setSelectedClient(null); setIsEditing(false); }} className="p-3 bg-zinc-900 border border-white/5 rounded-xl text-zinc-500 hover:text-white transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">{selectedClient.ragione_sociale}</h1>
              {selectedClient.tipo && <p className="text-xs text-zinc-500">{selectedClient.tipo}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
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
                <button onClick={() => navigate('/campaigns')} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest text-white transition-all">
                  <Briefcase size={14} /> Crea Campagna
                </button>
              </>
            )}
          </div>
        </div>

        {/* Client fields */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
          <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">Dettagli Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Tipo</label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.tipo || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, tipo: e.target.value }))}
                  placeholder="es. Agenzia, Brand, Produzione..."
                  className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                />
              ) : (
                <p className="text-sm text-white font-medium py-2">{selectedClient.tipo || '—'}</p>
              )}
            </div>
            <Field label="Ragione Sociale *" value={selectedClient.ragione_sociale} field="ragione_sociale" />
            <Field label="Referente" value={selectedClient.referente} field="referente" />
            <Field label="Email" value={selectedClient.email} field="email" type="email" />
            <Field label="Telefono" value={selectedClient.telefono} field="telefono" type="tel" />
          </div>
          <div className="mt-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Note</label>
            {isEditing ? (
              <textarea
                value={editForm.note || ''}
                onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                rows={3}
                className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500/50 focus:outline-none resize-none"
              />
            ) : (
              <p className="text-sm text-zinc-400 py-2">{selectedClient.note || '—'}</p>
            )}
          </div>
        </div>

        {/* Linked campaigns */}
        <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Campagne Collegate ({clientCampaigns.length})</h3>
          </div>

          {clientCampaigns.length === 0 ? (
            <div className="py-10 text-center">
              <Briefcase size={32} className="mx-auto text-zinc-800 mb-3" />
              <p className="text-sm font-bold text-zinc-700">Nessuna campagna collegata</p>
              <p className="text-xs text-zinc-600 mt-1">Crea una campagna per questo cliente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {clientCampaigns.map(camp => {
                const ctCount = campaignTalents.filter(ct => ct.campaign_id === camp.id).length;
                return (
                  <div
                    key={camp.id}
                    onClick={() => navigate('/campaigns')}
                    className="flex items-center justify-between p-4 bg-zinc-900/30 rounded-xl border border-white/5 cursor-pointer hover:border-blue-500/30 transition-all group"
                  >
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{camp.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-zinc-500">{camp.tipo}</span>
                        <span className="text-[10px] text-zinc-600">•</span>
                        <span className={`text-[10px] font-bold ${camp.status === 'Attiva' ? 'text-emerald-400' : camp.status === 'Chiusa' ? 'text-red-400' : 'text-zinc-500'}`}>{camp.status}</span>
                        <span className="text-[10px] text-zinc-600">•</span>
                        <span className="text-[10px] text-zinc-500">{ctCount} talent</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-zinc-400">€{camp.totalBudget.toLocaleString()}</span>
                      <ChevronRight size={14} className="text-zinc-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Delete */}
        {!isEditing && (
          <div className="pt-4 border-t border-white/5">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-[10px] font-black text-red-500/60 uppercase tracking-widest hover:text-red-400 transition-all"
            >
              <Trash2 size={14} /> Elimina Cliente
            </button>
          </div>
        )}

        {/* Delete Confirm */}
        <AnimatePresence>
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteConfirm(false)} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0c0c0c] border border-red-500/20 rounded-3xl w-full max-w-sm shadow-3xl p-8 text-center">
                <Trash2 size={32} className="mx-auto text-red-500 mb-4" />
                <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2">Elimina Cliente</h3>
                <p className="text-xs text-zinc-500 mb-6">
                  Eliminare <span className="text-white font-bold">{selectedClient.ragione_sociale}</span>? Azione irreversibile.
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
  }

  // List view
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Clienti</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            {clients.length} clienti
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-blue-500/20"
        >
          <Plus size={14} /> Nuovo Cliente
        </button>
      </div>

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 focus-within:border-blue-500/50 transition-all">
          <Search size={16} className="text-zinc-600 mr-3" />
          <input
            type="text"
            placeholder="Cerca per ragione sociale o referente..."
            className="bg-transparent border-none text-xs text-white placeholder-zinc-600 w-full font-bold outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-white"><X size={14} /></button>}
        </div>
        {tipos.length > 0 && (
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            className="bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase focus:outline-none"
          >
            <option value="ALL">Tutti i tipi</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <div className="bg-[#0c0c0c] border border-white/5 rounded-2xl overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 size={48} className="mx-auto text-zinc-800 mb-4" />
            <p className="text-sm font-black text-zinc-600 uppercase tracking-widest">Nessun cliente trovato</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-zinc-900/40 border-b border-white/5 text-[9px] font-black text-zinc-600 uppercase tracking-widest">
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Ragione Sociale</th>
                <th className="px-5 py-4">Referente</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Telefono</th>
                <th className="px-5 py-4">Campagne</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredClients.map(client => {
                const campCount = campaigns.filter(c => c.client_id === client.id).length;
                return (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="hover:bg-zinc-900/20 cursor-pointer transition-all group"
                  >
                    <td className="px-5 py-4">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{client.tipo || '—'}</span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{client.ragione_sociale}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-zinc-400">{client.referente || '—'}</td>
                    <td className="px-5 py-4 text-sm text-zinc-400">{client.email || '—'}</td>
                    <td className="px-5 py-4 text-sm text-zinc-400">{client.telefono || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-zinc-500">{campCount}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-lg shadow-3xl overflow-hidden">
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Nuovo Cliente</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white"><X size={18} /></button>
                </div>

                <form onSubmit={handleAdd} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Tipo</label>
                      <input
                        type="text"
                        placeholder="es. Brand, Agenzia..."
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                        value={newClient.tipo || ''}
                        onChange={e => setNewClient(prev => ({ ...prev, tipo: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Ragione Sociale *</label>
                      <input
                        type="text" required
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                        value={newClient.ragione_sociale || ''}
                        onChange={e => setNewClient(prev => ({ ...prev, ragione_sociale: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Referente</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                      value={newClient.referente || ''}
                      onChange={e => setNewClient(prev => ({ ...prev, referente: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                        value={newClient.email || ''}
                        onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Telefono</label>
                      <input
                        type="tel"
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none"
                        value={newClient.telefono || ''}
                        onChange={e => setNewClient(prev => ({ ...prev, telefono: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Note</label>
                    <textarea
                      rows={3}
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none resize-none"
                      value={newClient.note || ''}
                      onChange={e => setNewClient(prev => ({ ...prev, note: e.target.value }))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20"
                  >
                    {isSubmitting ? 'Creazione...' : 'Crea Cliente'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Clients;
