
import React, { useState, useMemo, useCallback } from 'react';
import { Grid, List, Plus, Globe, Phone, Mail, Briefcase, Trash2, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brand } from '../types';
import { useApp } from '../context/AppContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { AnimatedContainer } from '@/components/ui/animated-container';
import { SearchInput } from '@/components/ui/search-input';
import { staggerContainer, staggerItem } from '@/lib/animations';

const STORAGE_KEY = 'advenire_erp_brands';

function loadBrands(): Brand[] {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
}

function saveBrands(list: Brand[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

const Brands: React.FC = () => {
    const { showToast } = useApp();
    const [brands, setBrands] = useState<Brand[]>(loadBrands);

    const persistBrands = useCallback((updated: Brand[]) => {
        setBrands(updated);
        saveBrands(updated);
    }, []);

    const addBrand = useCallback(async (data: Omit<Brand, 'id'>): Promise<Brand> => {
        const newBrand: Brand = { ...data, id: crypto.randomUUID() };
        persistBrands([...brands, newBrand]);
        showToast('Brand creato', 'success');
        return newBrand;
    }, [brands, persistBrands, showToast]);

    const updateBrand = useCallback(async (id: string, updates: Partial<Brand>): Promise<Brand> => {
        const updated = brands.map(b => b.id === id ? { ...b, ...updates } : b);
        persistBrands(updated);
        const brand = updated.find(b => b.id === id)!;
        showToast('Brand aggiornato', 'success');
        return brand;
    }, [brands, persistBrands, showToast]);

    const deleteBrand = useCallback(async (id: string): Promise<void> => {
        persistBrands(brands.filter(b => b.id !== id));
        showToast('Brand eliminato', 'success');
    }, [brands, persistBrands, showToast]);
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
        <AnimatedContainer className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Brand & Clienti"
                subtitle="Gestione anagrafica clienti e partnership"
                actions={
                    <Button
                        onClick={openAddModal}
                        className="gap-2 font-bold uppercase text-[10px] tracking-widest"
                    >
                        <Plus size={14} />
                        <span>Nuovo Brand</span>
                    </Button>
                }
            />

            {/* Search + View Toggle */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Cerca brand, contatto o email..."
                    className="flex-1"
                />
                <div className="flex items-center bg-white/[0.02] p-1 rounded-xl border border-white/[0.06]">
                    <Button
                        variant={view === 'grid' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setView('grid')}
                        className="h-8 w-8"
                    >
                        <Grid size={16} />
                    </Button>
                    <Button
                        variant={view === 'list' ? 'default' : 'ghost'}
                        size="icon"
                        onClick={() => setView('list')}
                        className="h-8 w-8"
                    >
                        <List size={16} />
                    </Button>
                </div>
            </div>

            {/* Content */}
            <AnimatePresence mode="popLayout">
                {view === 'grid' ? (
                    <motion.div
                        key="grid"
                        variants={staggerContainer}
                        initial="hidden"
                        animate="show"
                        exit={{ opacity: 0 }}
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                    >
                        {filteredBrands.map((brand) => (
                            <motion.div key={brand.id} variants={staggerItem}>
                                <GlassCard
                                    variant="interactive"
                                    hover
                                    onClick={() => openEditModal(brand)}
                                    className="overflow-hidden flex flex-col group"
                                >
                                    {/* Logo area */}
                                    <div className="h-36 bg-white/[0.02] relative overflow-hidden flex items-center justify-center p-6">
                                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <img
                                            src={brand.logoUrl || emptyBrand.logoUrl}
                                            alt={brand.name}
                                            className="h-20 w-auto object-contain drop-shadow-2xl transition-transform duration-500 group-hover:scale-110"
                                        />
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                onClick={(e) => handleDelete(brand.id, e)}
                                                className="h-8 w-8"
                                            >
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Info area */}
                                    <div className="p-5 flex-1 flex flex-col">
                                        <h3 className="text-lg font-bold text-white tracking-tight mb-0.5">{brand.name}</h3>
                                        {brand.website && (
                                            <a
                                                href={brand.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[10px] font-bold text-primary hover:underline flex items-center mb-3"
                                                onClick={e => e.stopPropagation()}
                                            >
                                                <Globe size={11} className="mr-1" /> {brand.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        )}

                                        <div className="mt-auto space-y-2 pt-3 border-t border-white/[0.06]">
                                            {brand.contactName && (
                                                <div className="flex items-center text-muted-foreground">
                                                    <Briefcase size={12} className="mr-2.5 text-muted-foreground/60" />
                                                    <span className="text-[11px] font-semibold">{brand.contactName}</span>
                                                </div>
                                            )}
                                            {brand.email && (
                                                <div className="flex items-center text-muted-foreground">
                                                    <Mail size={12} className="mr-2.5 text-muted-foreground/60" />
                                                    <span className="text-[11px] font-semibold truncate">{brand.email}</span>
                                                </div>
                                            )}
                                            {brand.phone && (
                                                <div className="flex items-center text-muted-foreground">
                                                    <Phone size={12} className="mr-2.5 text-muted-foreground/60" />
                                                    <span className="text-[11px] font-semibold">{brand.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </GlassCard>
                            </motion.div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <GlassCard className="overflow-hidden">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-white/[0.02] border-b border-white/[0.08]">
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Brand</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contatto</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Riferimenti</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest text-right">Azioni</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.06]">
                                    {filteredBrands.map((brand) => (
                                        <tr key={brand.id} onClick={() => openEditModal(brand)} className="hover:bg-white/[0.02] cursor-pointer transition-all">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 bg-white/[0.04] rounded-xl p-1.5 flex items-center justify-center border border-white/[0.06]">
                                                        <img src={brand.logoUrl || emptyBrand.logoUrl} className="max-w-full max-h-full object-contain" alt="" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white">{brand.name}</p>
                                                        {brand.vat && <p className="text-[10px] text-muted-foreground font-semibold">P.IVA: {brand.vat}</p>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-muted-foreground">
                                                {brand.contactName || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    {brand.email && <div className="flex items-center text-xs font-semibold text-muted-foreground"><Mail size={12} className="mr-2" /> {brand.email}</div>}
                                                    {brand.phone && <div className="flex items-center text-xs font-semibold text-muted-foreground"><Phone size={12} className="mr-2" /> {brand.phone}</div>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end space-x-1.5">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => { e.stopPropagation(); openEditModal(brand); }}
                                                        className="h-8 w-8"
                                                    >
                                                        <Edit3 size={14} />
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        size="icon"
                                                        onClick={(e) => handleDelete(brand.id, e)}
                                                        className="h-8 w-8"
                                                    >
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </GlassCard>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty state */}
            {filteredBrands.length === 0 && (
                <div className="py-20 text-center">
                    <Plus size={48} className="mx-auto text-white/[0.06] mb-4" />
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Nessun brand trovato</p>
                    <p className="text-xs text-muted-foreground mt-2">Prova a modificare la ricerca o aggiungi un nuovo brand</p>
                </div>
            )}

            {/* Add/Edit Modal */}
            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent className="max-w-2xl p-8">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold uppercase tracking-tight">
                            {editingBrand ? 'Modifica Brand' : 'Nuovo Brand'}
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Logo preview + URL */}
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-white/[0.04] rounded-2xl border border-white/[0.08] flex items-center justify-center p-2 overflow-hidden">
                                <img src={formData.logoUrl} alt="" className="w-full h-full object-contain" />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <Label>Logo URL</Label>
                                <Input
                                    type="url"
                                    value={formData.logoUrl}
                                    onChange={e => setFormData({ ...formData, logoUrl: e.target.value })}
                                    placeholder="Rate it!"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Nome Brand *</Label>
                                <Input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Es. Nike"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Referente</Label>
                                <Input
                                    type="text"
                                    value={formData.contactName}
                                    onChange={e => setFormData({ ...formData, contactName: e.target.value })}
                                    placeholder="Es. Mario Rossi"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Telefono</Label>
                                <Input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label>Sito Web</Label>
                                <Input
                                    type="url"
                                    value={formData.website}
                                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                                    placeholder="https://"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>P.IVA</Label>
                                <Input
                                    type="text"
                                    value={formData.vat}
                                    onChange={e => setFormData({ ...formData, vat: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Note</Label>
                            <Textarea
                                rows={3}
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Informazioni aggiuntive..."
                            />
                        </div>

                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full font-bold uppercase text-[10px] tracking-widest py-4 mt-2"
                        >
                            {isSubmitting ? 'Salvataggio...' : (editingBrand ? 'Salva Modifiche' : 'Crea Brand')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </AnimatedContainer>
    );
};

export default Brands;
