
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, Plus, X, Save, Edit3, Trash2, Building2, ArrowLeft,
  Phone, Mail, User, ChevronRight, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Client, Campaign } from '../types';
import { useApp } from '../context/AppContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SearchInput } from '@/components/ui/search-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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
        <Label className="block mb-1.5">{label}</Label>
        {isEditing ? (
          <Input
            type={type}
            value={(editForm as any)[field] || ''}
            onChange={e => setEditForm(prev => ({ ...prev, [field]: e.target.value }))}
          />
        ) : (
          <p className="text-sm text-white font-medium py-2">{value || '—'}</p>
        )}
      </div>
    );

    return (
      <AnimatedContainer className="max-w-4xl mx-auto space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => { setSelectedClient(null); setIsEditing(false); }}
            >
              <ArrowLeft size={20} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-tight">{selectedClient.ragione_sociale}</h1>
              {selectedClient.tipo && <p className="text-xs text-zinc-500">{selectedClient.tipo}</p>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X size={14} /> Annulla
                </Button>
                <Button variant="default" className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20" onClick={handleSaveEdit}>
                  <Save size={14} /> Salva
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleStartEdit}>
                  <Edit3 size={14} /> Modifica
                </Button>
                <Button onClick={() => navigate('/campaigns')}>
                  <Briefcase size={14} /> Crea Campagna
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Client fields */}
        <GlassCard className="p-6">
          <Label className="block mb-6">Dettagli Cliente</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <Label className="block mb-1.5">Tipo</Label>
              {isEditing ? (
                <Input
                  type="text"
                  value={editForm.tipo || ''}
                  onChange={e => setEditForm(prev => ({ ...prev, tipo: e.target.value }))}
                  placeholder="es. Agenzia, Brand, Produzione..."
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
            <Label className="block mb-1.5">Note</Label>
            {isEditing ? (
              <Textarea
                value={editForm.note || ''}
                onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                rows={3}
              />
            ) : (
              <p className="text-sm text-zinc-400 py-2">{selectedClient.note || '—'}</p>
            )}
          </div>
        </GlassCard>

        {/* Linked campaigns */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Label>Campagne Collegate ({clientCampaigns.length})</Label>
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
                    className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.08] cursor-pointer hover:border-blue-500/30 hover:bg-white/[0.06] transition-all group"
                  >
                    <div>
                      <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">{camp.name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-zinc-500">{camp.tipo}</span>
                        <span className="text-[10px] text-zinc-600">•</span>
                        <Badge variant={camp.status === 'Attiva' ? 'success' : camp.status === 'Chiusa' ? 'destructive' : 'secondary'}>
                          {camp.status}
                        </Badge>
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
        </GlassCard>

        {/* Delete */}
        {!isEditing && (
          <div className="pt-4 border-t border-white/[0.08]">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 text-[10px] font-bold text-red-500/60 uppercase tracking-widest hover:text-red-400 transition-all"
            >
              <Trash2 size={14} /> Elimina Cliente
            </button>
          </div>
        )}

        {/* Delete Confirm Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="max-w-sm text-center">
            <div className="flex flex-col items-center gap-4">
              <Trash2 size={32} className="text-red-500" />
              <DialogHeader>
                <DialogTitle className="text-lg font-bold text-white uppercase tracking-tight">Elimina Cliente</DialogTitle>
              </DialogHeader>
              <p className="text-xs text-zinc-500">
                Eliminare <span className="text-white font-bold">{selectedClient.ragione_sociale}</span>? Azione irreversibile.
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
  }

  // List view
  return (
    <AnimatedContainer className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Clienti"
        subtitle={`${clients.length} clienti`}
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus size={14} /> Nuovo Cliente
          </Button>
        }
      />

      {/* Search + Filter */}
      <div className="flex items-center gap-3">
        <SearchInput
          className="flex-1"
          value={search}
          onChange={setSearch}
          placeholder="Cerca per ragione sociale o referente..."
        />
        {tipos.length > 0 && (
          <select
            value={tipoFilter}
            onChange={e => setTipoFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm rounded-xl px-4 py-2.5 text-[10px] font-bold text-zinc-400 uppercase focus:outline-none focus:border-primary/50 transition-all duration-200"
          >
            <option value="ALL">Tutti i tipi</option>
            {tipos.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        {filteredClients.length === 0 ? (
          <div className="py-20 text-center">
            <Building2 size={48} className="mx-auto text-zinc-800 mb-4" />
            <p className="text-sm font-bold text-zinc-600 uppercase tracking-widest">Nessun cliente trovato</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="bg-white/[0.02] border-b border-white/[0.08] text-[9px] font-bold text-zinc-600 uppercase tracking-widest">
                <th className="px-5 py-4">Tipo</th>
                <th className="px-5 py-4">Ragione Sociale</th>
                <th className="px-5 py-4">Referente</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Telefono</th>
                <th className="px-5 py-4">Campagne</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.08]">
              {filteredClients.map(client => {
                const campCount = campaigns.filter(c => c.client_id === client.id).length;
                return (
                  <tr
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="hover:bg-white/[0.03] cursor-pointer transition-all group"
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
          </div>
        )}
      </GlassCard>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-white uppercase tracking-tight">Nuovo Cliente</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-1.5">Tipo</Label>
                <Input
                  type="text"
                  placeholder="es. Brand, Agenzia..."
                  value={newClient.tipo || ''}
                  onChange={e => setNewClient(prev => ({ ...prev, tipo: e.target.value }))}
                />
              </div>
              <div>
                <Label className="block mb-1.5">Ragione Sociale *</Label>
                <Input
                  type="text"
                  required
                  value={newClient.ragione_sociale || ''}
                  onChange={e => setNewClient(prev => ({ ...prev, ragione_sociale: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="block mb-1.5">Referente</Label>
              <Input
                type="text"
                value={newClient.referente || ''}
                onChange={e => setNewClient(prev => ({ ...prev, referente: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="block mb-1.5">Email</Label>
                <Input
                  type="email"
                  value={newClient.email || ''}
                  onChange={e => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
              <div>
                <Label className="block mb-1.5">Telefono</Label>
                <Input
                  type="tel"
                  value={newClient.telefono || ''}
                  onChange={e => setNewClient(prev => ({ ...prev, telefono: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="block mb-1.5">Note</Label>
              <Textarea
                rows={3}
                value={newClient.note || ''}
                onChange={e => setNewClient(prev => ({ ...prev, note: e.target.value }))}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Creazione...' : 'Crea Cliente'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </AnimatedContainer>
  );
};

export default Clients;
