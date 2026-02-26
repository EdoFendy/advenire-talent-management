
import React, { useState, useEffect } from 'react';
import { Settings, Edit3, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { CompanySettings as CompanySettingsType } from '../types';
import { useApp } from '../context/AppContext';

const CompanySettingsPage: React.FC = () => {
  const { companySettings, fetchCompanySettings, updateCompanySettings, showToast } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Partial<CompanySettingsType>>({});

  useEffect(() => {
    if (!companySettings) {
      fetchCompanySettings();
    }
  }, []);

  const handleStartEdit = () => {
    setForm({ ...companySettings });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setForm({});
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateCompanySettings(form);
      setIsEditing(false);
    } catch (err: any) {
      showToast(err.message || 'Errore durante il salvataggio', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const Field: React.FC<{
    label: string;
    field: keyof CompanySettingsType;
    type?: string;
    placeholder?: string;
  }> = ({ label, field, type = 'text', placeholder }) => (
    <div>
      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">
        {label}
      </label>
      {isEditing ? (
        <input
          type={type}
          placeholder={placeholder}
          value={(form as any)[field] || ''}
          onChange={e => update(field, e.target.value)}
          className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-colors"
        />
      ) : (
        <p className="text-sm text-white font-medium py-2.5">
          {(companySettings as any)?.[field] || '\u2014'}
        </p>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6 pb-20"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-zinc-900 border border-white/5 rounded-xl">
            <Settings size={20} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">
              Impostazioni Azienda
            </h1>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
              Anagrafica e dati aziendali
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all"
              >
                <X size={14} /> Annulla
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest text-white transition-all shadow-lg shadow-blue-500/20"
              >
                <Save size={14} /> {isSaving ? 'Salvataggio...' : 'Salva'}
              </button>
            </>
          ) : (
            <button
              onClick={handleStartEdit}
              className="flex items-center gap-2 bg-zinc-900 px-4 py-2.5 rounded-xl border border-white/5 font-black uppercase text-[10px] tracking-widest text-zinc-400 hover:text-white transition-all"
            >
              <Edit3 size={14} /> Modifica
            </button>
          )}
        </div>
      </div>

      {/* Dati Azienda */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6"
      >
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">
          Dati Azienda
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ragione Sociale" field="ragione_sociale" placeholder="es. Advenire S.r.l." />
          <Field label="Partita IVA" field="piva" placeholder="es. 01234567890" />
          <Field label="Codice Fiscale" field="codice_fiscale" placeholder="es. 01234567890" />
          <Field label="Codice SDI" field="sdi" placeholder="es. XXXXXXX" />
        </div>
      </motion.div>

      {/* Indirizzo */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6"
      >
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">
          Indirizzo
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <div className="md:col-span-2">
            <Field label="Via / Indirizzo" field="indirizzo_via" placeholder="es. Via Roma 1" />
          </div>
          <Field label="Città" field="indirizzo_citta" placeholder="es. Milano" />
          <div className="grid grid-cols-2 gap-4">
            <Field label="CAP" field="indirizzo_cap" placeholder="es. 20100" />
            <Field label="Paese" field="indirizzo_paese" placeholder="es. Italia" />
          </div>
        </div>
      </motion.div>

      {/* Contatti */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6"
      >
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">
          Contatti
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Email" field="email" type="email" placeholder="es. info@azienda.it" />
          <Field label="Telefono" field="telefono" type="tel" placeholder="es. +39 02 1234567" />
          <Field label="PEC" field="pec" type="email" placeholder="es. azienda@pec.it" />
          <Field label="Sito Web" field="website" type="url" placeholder="es. https://azienda.it" />
        </div>
      </motion.div>

      {/* Note */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-6"
      >
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-6">
          Note
        </h3>
        {isEditing ? (
          <textarea
            rows={4}
            placeholder="Note aggiuntive sull'azienda..."
            value={form.note || ''}
            onChange={e => update('note', e.target.value)}
            className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500/50 resize-none transition-colors"
          />
        ) : (
          <p className="text-sm text-zinc-400 py-2">
            {companySettings?.note || '\u2014'}
          </p>
        )}
      </motion.div>

      {/* Last updated */}
      {companySettings?.updated_at && (
        <p className="text-[10px] font-bold text-zinc-600 text-right">
          Ultimo aggiornamento: {new Date(companySettings.updated_at).toLocaleString('it-IT')}
        </p>
      )}
    </motion.div>
  );
};

export default CompanySettingsPage;
