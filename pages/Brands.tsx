
import React, { useState, useMemo } from 'react';
import { Search, Grid, List, Plus, MoreHorizontal, X, Image as ImageIcon, Briefcase, Globe, Phone, Mail, MapPin, Building2, Trash2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brand } from '../types';
import { useApp } from '../context/AppContext';

interface BrandsProps {
    brands: Brand[];
    addBrand: (brand: Omit<Brand, 'id'>) => Promise<Brand>;
    updateBrand: (id: string, updates: Partial<Brand>) => Promise<Brand>;
    deleteBrand: (id: string) => Promise<void>;
}

const Brands: React.FC<BrandsProps> = ({ brands, addBrand, updateBrand, deleteBrand }) => {
    const { showToast } = useApp();
    const [view, setView] = useState<'grid' | 'list'>('grid');
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    const filteredBrands = useMemo(() => {
        return brands.filter(b =>
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            b.contactName?.toLowerCase().includes(search.toLowerCase()) ||
            b.email?.toLowerCase().includes(search.toLowerCase())
        );
    }, [brands, search]);

    const emptyBrand = {
        name: '',
        contactName: '',
        email: '',
        phone: '',
        website: '',
        vat: '',
        address: '',
        notes: '',
        logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=400&auto=format&fit=crop&q=60&ixlib=rb-4.0.3' // Default generic logo
    };

    const [formData, setFormData] = useState(emptyBrand);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const openAddModal = () => {
        setEditingBrand(null);
        setFormData(emptyBrand);
        setShowModal(true);
    };

    const openEditModal = (brand: Brand) => {
        setEditingBrand(brand);
        setFormData({
            name: brand.name,
            contactName: brand.contactName || '',
            email: brand.email || '',
            phone: brand.phone || '',
            website: brand.website || '',
            vat: brand.vat || '',
            address: brand.address || '',
            notes: brand.notes || '',
            logoUrl: brand.logoUrl || emptyBrand.logoUrl
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingBrand) {
                await updateBrand(editingBrand.id, formData);
            } else {
                await addBrand(formData);
            }
            setShowModal(false);
        } catch (error) {
            console.error('Failed to save brand:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Sei sicuro di voler eliminare questo brand?')) {
            await deleteBrand(id);
        }
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-20">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Brand & Clienti</h1>
                    <p className="text-zinc-500 font-medium text-lg">Gestione anagrafica clienti e partnership.</p>
                </div>
                <button
                    onClick={openAddModal}
                    className="flex items-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                    <Plus size={20} />
                    <span>Nuovo Brand</span>
                </button>
            </header>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-zinc-900/40 p-3 rounded-3xl border border-white/5 backdrop-blur-md">
                <div className="flex items-center bg-zinc-800/80 rounded-2xl px-5 py-3 w-full lg:w-[500px] border border-white/5 focus-within:border-blue-500/50 transition-all">
                    <Search size={18} className="text-zinc-500 mr-3" />
                    <input
                        type="text"
                        placeholder="Cerca brand, contatto o email..."
                        className="bg-transparent border-none text-sm focus:ring-0 text-zinc-200 placeholder-zinc-600 w-full font-bold outline-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

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

            <AnimatePresence mode="popLayout">
                {view === 'grid' ? (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
                    >
                        {filteredBrands.map((brand, idx) => (
                            <motion.div
                                layoutId={brand.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                key={brand.id}
                                onClick={() => openEditModal(brand)}
                                className="bg-[#0c0c0c] border border-white/5 rounded-[2.5rem] overflow-hidden group cursor-pointer hover:border-blue-500/50 hover:shadow-[0_32px_64px_-16px_rgba(59,130,246,0.15)] transition-all duration-500 flex flex-col"
                            >
                                <div className="h-40 bg-zinc-900/50 relative overflow-hidden flex items-center justify-center p-8">
                                    <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <img
                                        src={brand.logoUrl || emptyBrand.logoUrl}
                                        alt={brand.name}
                                        className="h-24 w-auto object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                                    />
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => handleDelete(brand.id, e)} className="p-2 bg-red-500/20 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                                <div className="p-8 flex-1 flex flex-col">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-1">{brand.name}</h3>
                                    {brand.website && (
                                        <a href={brand.website} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-blue-500 hover:underline flex items-center mb-4" onClick={e => e.stopPropagation()}>
                                            <Globe size={12} className="mr-1" /> {brand.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    )}

                                    <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
                                        {brand.contactName && (
                                            <div className="flex items-center text-zinc-400">
                                                <Briefcase size={14} className="mr-3 text-zinc-600" />
                                                <span className="text-xs font-bold">{brand.contactName}</span>
                                            </div>
                                        )}
                                        {brand.email && (
                                            <div className="flex items-center text-zinc-400">
                                                <Mail size={14} className="mr-3 text-zinc-600" />
                                                <span className="text-xs font-bold truncate">{brand.email}</span>
                                            </div>
                                        )}
                                        {brand.phone && (
                                            <div className="flex items-center text-zinc-400">
                                                <Phone size={14} className="mr-3 text-zinc-600" />
                                                <span className="text-xs font-bold">{brand.phone}</span>
                                            </div>
                                        )}
                                    </div>
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
                                    <th className="px-8 py-6">Brand</th>
                                    <th className="px-8 py-6">Contatto</th>
                                    <th className="px-8 py-6">Riferimenti</th>
                                    <th className="px-8 py-6 text-right">Azioni</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredBrands.map((brand) => (
                                    <tr key={brand.id} onClick={() => openEditModal(brand)} className="hover:bg-zinc-900/20 cursor-pointer transition-all">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-white/5 rounded-xl p-2 flex items-center justify-center">
                                                    <img src={brand.logoUrl || emptyBrand.logoUrl} className="max-w-full max-h-full object-contain" alt="" />
                                                </div>
                                                <div>
                                                    <p className="font-black text-white text-lg">{brand.name}</p>
                                                    {brand.vat && <p className="text-[10px] text-zinc-500 font-bold uppercase">P.IVA: {brand.vat}</p>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-bold text-zinc-400">
                                            {brand.contactName || '-'}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                {brand.email && <div className="flex items-center text-xs font-bold text-zinc-400"><Mail size={12} className="mr-2" /> {brand.email}</div>}
                                                {brand.phone && <div className="flex items-center text-xs font-bold text-zinc-400"><Phone size={12} className="mr-2" /> {brand.phone}</div>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex justify-end space-x-2">
                                                <button onClick={(e) => { e.stopPropagation(); openEditModal(brand); }} className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white hover:bg-zinc-700">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={(e) => handleDelete(brand.id, e)} className="p-2 bg-zinc-800 text-red-500 rounded-lg hover:bg-red-500/20">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-black/90 backdrop-blur-lg" />
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-[#0c0c0c] border border-white/10 rounded-[2.5rem] w-full max-w-2xl overflow-hidden p-8 shadow-2xl">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="text-3xl font-black text-white uppercase tracking-tighter">{editingBrand ? 'Modifica Brand' : 'Nuovo Brand'}</h3>
                                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-zinc-900 rounded-xl transition-all text-zinc-500 hover:text-white"><X size={24} /></button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-20 h-20 bg-zinc-900 rounded-2xl border border-white/10 flex items-center justify-center p-2 overflow-hidden">
                                            <img src={formData.logoUrl} alt="" className="w-full h-full object-contain" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Logo URL</label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-blue-500"
                                                    value={formData.logoUrl}
                                                    onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                                                    placeholder="Rate it!"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nome Brand *</label>
                                            <input type="text" required className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-blue-500" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Es. Nike" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Referente</label>
                                            <input type="text" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-blue-500" value={formData.contactName} onChange={e => setFormData({ ...formData, contactName: e.target.value })} placeholder="Es. Mario Rossi" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Email</label>
                                            <input type="email" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-blue-500" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Telefono</label>
                                            <input type="tel" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-blue-500" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Sito Web</label>
                                            <input type="url" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-blue-500" value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">P.IVA</label>
                                            <input type="text" className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-blue-500" value={formData.vat} onChange={e => setFormData({ ...formData, vat: e.target.value })} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Note</label>
                                        <textarea rows={3} className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-blue-500 resize-none" value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Informazioni aggiuntive..." />
                                    </div>
                                </div>

                                <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-xs tracking-widest py-5 rounded-2xl transition-all shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50">
                                    {isSubmitting ? 'Salvataggio...' : (editingBrand ? 'Salva Modifiche' : 'Crea Brand')}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Brands;
