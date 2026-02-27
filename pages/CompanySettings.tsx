
import React, { useState, useEffect } from 'react';
import { Edit3, Save, X } from 'lucide-react';
import { CompanySettings as CompanySettingsType } from '../types';
import { useApp } from '../context/AppContext';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/ui/page-header';
import { AnimatedContainer } from '@/components/ui/animated-container';

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
      <Label className="text-[10px] block mb-1">
        {label}
      </Label>
      {isEditing ? (
        <Input
          type={type}
          placeholder={placeholder}
          value={(form as any)[field] || ''}
          onChange={e => update(field, e.target.value)}
        />
      ) : (
        <p className="text-sm text-white font-medium py-2.5">
          {(companySettings as any)?.[field] || '\u2014'}
        </p>
      )}
    </div>
  );

  return (
    <AnimatedContainer className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <PageHeader
        title="Impostazioni Azienda"
        subtitle="Anagrafica e dati aziendali"
        actions={
          isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                <X size={14} /> Annulla
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save size={14} /> {isSaving ? 'Salvataggio...' : 'Salva'}
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartEdit}
            >
              <Edit3 size={14} /> Modifica
            </Button>
          )
        }
      />

      {/* Dati Azienda */}
      <GlassCard className="p-6">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">
          Dati Azienda
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Ragione Sociale" field="ragione_sociale" placeholder="es. Advenire S.r.l." />
          <Field label="Partita IVA" field="piva" placeholder="es. 01234567890" />
          <Field label="Codice Fiscale" field="codice_fiscale" placeholder="es. 01234567890" />
          <Field label="Codice SDI" field="sdi" placeholder="es. XXXXXXX" />
        </div>
      </GlassCard>

      {/* Indirizzo */}
      <GlassCard className="p-6">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">
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
      </GlassCard>

      {/* Contatti */}
      <GlassCard className="p-6">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">
          Contatti
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          <Field label="Email" field="email" type="email" placeholder="es. info@azienda.it" />
          <Field label="Telefono" field="telefono" type="tel" placeholder="es. +39 02 1234567" />
          <Field label="PEC" field="pec" type="email" placeholder="es. azienda@pec.it" />
          <Field label="Sito Web" field="website" type="url" placeholder="es. https://azienda.it" />
        </div>
      </GlassCard>

      {/* Note */}
      <GlassCard className="p-6">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-6">
          Note
        </h3>
        {isEditing ? (
          <Textarea
            rows={4}
            placeholder="Note aggiuntive sull'azienda..."
            value={form.note || ''}
            onChange={e => update('note', e.target.value)}
          />
        ) : (
          <p className="text-sm text-zinc-400 py-2">
            {companySettings?.note || '\u2014'}
          </p>
        )}
      </GlassCard>

      {/* Last updated */}
      {companySettings?.updated_at && (
        <p className="text-[10px] font-bold text-zinc-600 text-right">
          Ultimo aggiornamento: {new Date(companySettings.updated_at).toLocaleString('it-IT')}
        </p>
      )}
    </AnimatedContainer>
  );
};

export default CompanySettingsPage;
