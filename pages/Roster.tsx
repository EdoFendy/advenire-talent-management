
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, FileText, Loader2, UserPlus, Check, Download, ChevronRight, ChevronLeft, AlertTriangle, CheckCircle, XCircle, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { talentsApi } from '../api';
import * as XLSX from 'xlsx';

// ============== FIXED COLUMN DEFINITIONS (formato unico, non personalizzabile) ==============
const TEMPLATE_COLUMNS = [
  // Dati personali
  { key: 'firstName', label: 'Nome', required: true },
  { key: 'lastName', label: 'Cognome', required: true },
  { key: 'stageName', label: 'Nome d\'arte', required: false },
  { key: 'display_name', label: 'Nome visualizzato', required: false },
  { key: 'birthDate', label: 'Data di nascita', required: false },
  { key: 'status', label: 'Stato (active/inactive)', required: false },
  { key: 'phone', label: 'Telefono', required: false },
  { key: 'email', label: 'Email', required: false },
  // Indirizzo spedizione
  { key: 'address_street', label: 'Indirizzo / Via', required: false },
  { key: 'address_city', label: 'Citta', required: false },
  { key: 'address_zip', label: 'CAP', required: false },
  { key: 'address_country', label: 'Paese', required: false },
  { key: 'shippingNotes', label: 'Note spedizione', required: false },
  // Social
  { key: 'tiktok', label: 'TikTok URL', required: false },
  { key: 'tiktokFollowers', label: 'TikTok Followers', required: false },
  { key: 'instagram', label: 'Instagram URL', required: false },
  { key: 'instagramFollowers', label: 'Instagram Followers', required: false },
  { key: 'youtube_url', label: 'YouTube URL', required: false },
  { key: 'twitch_url', label: 'Twitch URL', required: false },
  { key: 'other_socials', label: 'Altri social', required: false },
  // Pagamenti
  { key: 'payout_method', label: 'Metodo pagamento (IBAN/PayPal/Entrambi)', required: false },
  { key: 'iban', label: 'IBAN', required: false },
  { key: 'bank_name', label: 'Nome banca', required: false },
  { key: 'paypal_email', label: 'Email PayPal / Link Revolut', required: false },
  { key: 'vat', label: 'P.IVA', required: false },
  { key: 'fiscal_code', label: 'Codice Fiscale', required: false },
  // Fatturazione
  { key: 'billing_name', label: 'Intestatario fatturazione', required: false },
  { key: 'billing_address_street', label: 'Via fatturazione', required: false },
  { key: 'billing_address_city', label: 'Citta fatturazione', required: false },
  { key: 'billing_address_zip', label: 'CAP fatturazione', required: false },
  { key: 'billing_address_country', label: 'Paese fatturazione', required: false },
  // Note
  { key: 'notes', label: 'Note', required: false },
];

// ============== BILLING DATA EXTRACTION ==============
function extractFromBillingData(text: string) {
  if (!text) return {};
  const result: Record<string, string> = {};

  // Extract IBAN (Italian format IT + 2 check + 1 letter + rest, with optional spaces)
  const ibanMatch = text.match(/IT\s*[0-9A-Z]{2}\s*[A-Z0-9]\s*[0-9A-Z\s]{10,30}/i);
  if (ibanMatch) {
    result.iban = ibanMatch[0].replace(/\s/g, '');
  }

  // Extract PayPal URL
  const paypalMatch = text.match(/(paypal\.me\/[^\s;,]+)/i);
  if (paypalMatch) result.paypal_email = 'https://www.' + paypalMatch[1];
  // Revolut as alternative
  if (!result.paypal_email) {
    const revolutMatch = text.match(/(revolut\.me\/[^\s;,]+)/i);
    if (revolutMatch) result.paypal_email = 'https://' + revolutMatch[1];
  }

  // Extract P.IVA (11 digits, possibly with prefix)
  const pivaMatch = text.match(/(?:P\.?\s*I\.?V\.?A\.?|Partita\s+IVA)[:\s]*([0-9]{11})/i);
  if (pivaMatch) result.vat = pivaMatch[1];

  // Determine payout method
  if (result.iban && result.paypal_email) result.payout_method = 'Entrambi';
  else if (result.iban) result.payout_method = 'IBAN';
  else if (result.paypal_email) result.payout_method = 'PayPal';

  // Extract billing name from "(Name Surname)" pattern or "Name; IBAN:" pattern
  const parenName = text.match(/\(([A-Za-zÀ-ú\s]{3,40})\)/);
  if (parenName) result.billing_name = parenName[1].trim();
  if (!result.billing_name) {
    const nameFirst = text.match(/^([A-Za-zÀ-ú\s]{3,40})\s*[;:]/);
    if (nameFirst) result.billing_name = nameFirst[1].trim();
  }

  return result;
}

// ============== TEMPLATE DOWNLOAD ==============
function downloadTemplate() {
  const headers = TEMPLATE_COLUMNS.map(c => c.label);
  const exampleRow = [
    'Mario', 'Rossi', 'MarioR', 'Mario Rossi', '1990-01-15', 'active', '+39 333 1234567', 'mario.rossi@email.com',
    'Via Roma 1', 'Milano', '20100', 'Italia', 'Citofono Rossi',
    'https://tiktok.com/@mario', '50000', 'https://instagram.com/mario', '30000', 'https://youtube.com/@mario', '', '',
    'Entrambi', 'IT60X0542811101000000123456', 'Banca Esempio', 'https://paypal.me/mariorossi', '12345678901', 'RSSMRA90A01F205X',
    'Mario Rossi SRL', 'Via Roma 1', 'Milano', '20100', 'Italia',
    ''
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  ws['!cols'] = headers.map(() => ({ wch: 24 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Talenti');
  XLSX.writeFile(wb, 'template_talenti_advenire.xlsx');
}

// ============== VALIDATION HELPERS ==============
interface ValidationError {
  row: number;
  field: string;
  message: string;
}

function validateRow(row: Record<string, string>, rowIndex: number): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!row.firstName?.trim()) errors.push({ row: rowIndex + 1, field: 'Nome', message: 'Nome è obbligatorio' });
  if (!row.lastName?.trim()) errors.push({ row: rowIndex + 1, field: 'Cognome', message: 'Cognome è obbligatorio' });
  // Email validation only if provided
  if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email.trim())) {
    errors.push({ row: rowIndex + 1, field: 'Email', message: 'Formato email non valido (non blocca importazione)' });
  }
  return errors;
}

// ============== AUTO-MAP LOGIC ==============
function autoMapColumns(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const lowerHeaders = headers.map(h => h.toLowerCase().trim().replace(/_/g, ' '));

  const patterns: Record<string, string[]> = {
    firstName: ['nome', 'first name', 'firstname', 'name'],
    lastName: ['cognome', 'last name', 'lastname', 'surname'],
    stageName: ['nome d\'arte', 'stage name', 'stagename', 'display name', 'nome visualizzato'],
    status: ['stato', 'status', 'attivo'],
    phone: ['telefono', 'phone', 'tel', 'cellulare', 'mobile'],
    email: ['email', 'e-mail', 'mail', 'posta'],
    address_street: ['via', 'indirizzo', 'street', 'address', 'via e numero', 'indirizzo spedizione'],
    address_city: ['città', 'citta', 'city'],
    address_zip: ['cap', 'zip', 'postal code', 'codice postale'],
    address_country: ['paese', 'country', 'nazione'],
    notes: ['note', 'notes', 'commenti'],
    tiktok: ['tiktok', 'tiktok url'],
    tiktokFollowers: ['tiktok followers', 'tiktok followers est', 'tiktok followers raw'],
    instagram: ['instagram', 'instagram url', 'ig'],
    instagramFollowers: ['instagram followers', 'instagram followers est', 'instagram followers raw'],
    youtube_url: ['youtube', 'youtube url', 'yt'],
    twitch_url: ['twitch', 'twitch url'],
    other_socials: ['altri social', 'other socials'],
    payout_method: ['metodo pagamento', 'payout method', 'payment method'],
    iban: ['iban'],
    bank_name: ['banca', 'bank', 'nome banca'],
    paypal_email: ['paypal', 'email paypal', 'paypal email'],
    vat: ['p.iva', 'p iva', 'piva', 'partita iva', 'vat'],
    fiscal_code: ['codice fiscale', 'fiscal code', 'cf'],
    billing_name: ['intestatario', 'nome intestatario', 'billing name'],
    billing_address_street: ['via fatturazione', 'billing street', 'indirizzo fatturazione'],
    billing_address_city: ['città fatturazione', 'citta fatturazione', 'billing city'],
    billing_address_zip: ['cap fatturazione', 'billing zip'],
    billing_address_country: ['paese fatturazione', 'billing country'],
    _billing_data: ['dati fatturazione', 'billing data', 'dati pagamento', 'payment data'],
  };

  for (let i = 0; i < lowerHeaders.length; i++) {
    const h = lowerHeaders[i];
    for (const [key, aliases] of Object.entries(patterns)) {
      if (aliases.includes(h) || aliases.some(a => h.includes(a))) {
        mapping[String(i)] = key;
        break;
      }
    }
  }
  return mapping;
}

// ============== IMPORT WIZARD COMPONENT ==============
const ImportWizard: React.FC<{ onClose: () => void; onComplete: (result: any) => void }> = ({ onClose, onComplete }) => {
  const { fetchTalents } = useApp();
  const [step, setStep] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Step 1: File
  const [rawData, setRawData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  // Step 2: Mapping
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Step 3-4: Preview & Validation
  const [mappedRows, setMappedRows] = useState<Record<string, string>[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Step 5: Result
  const [importResult, setImportResult] = useState<any>(null);

  // Step 1: Parse file (XLSX, XLS, or CSV) - formato fisso, mappatura automatica
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', codepage: 65001 });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

        if (json.length < 2) return;

        const hdrs = json[0].map(String);
        const rows = json.slice(1).filter(row => row.some(cell => String(cell).trim()));
        setHeaders(hdrs);
        setRawData(rows.map(row => row.map(String)));

        // Mappatura automatica con formato fisso: colonne in ordine TEMPLATE_COLUMNS
        const autoMap: Record<string, string> = {};
        // Prova prima la mappatura per posizione (formato fisso)
        const templateLabels = TEMPLATE_COLUMNS.map(c => c.label.toLowerCase().trim());
        const fileLabels = hdrs.map(h => h.toLowerCase().trim());

        // Check if file matches fixed template format (by label match)
        let matchCount = 0;
        for (let i = 0; i < Math.min(hdrs.length, TEMPLATE_COLUMNS.length); i++) {
          if (templateLabels[i] && fileLabels[i] && (
            templateLabels[i] === fileLabels[i] ||
            templateLabels[i].includes(fileLabels[i]) ||
            fileLabels[i].includes(templateLabels[i])
          )) {
            matchCount++;
          }
        }

        // If file matches fixed format (>50% match), use positional mapping
        if (matchCount >= Math.min(hdrs.length, TEMPLATE_COLUMNS.length) * 0.5) {
          for (let i = 0; i < Math.min(hdrs.length, TEMPLATE_COLUMNS.length); i++) {
            autoMap[String(i)] = TEMPLATE_COLUMNS[i].key;
          }
        } else {
          // Fallback: try fuzzy auto-mapping
          const fallbackMap = autoMapColumns(hdrs);
          Object.assign(autoMap, fallbackMap);
        }

        setColumnMapping(autoMap);

        // Skip mapping step - go directly to preview (apply mapping immediately)
        const mappedResult = rows.map(row => {
          const mapped: Record<string, string> = {};
          for (const colIdx of Object.keys(autoMap)) {
            const fieldKey = autoMap[colIdx];
            if (!fieldKey || fieldKey === '_skip') continue;
            const cellValue = row[parseInt(colIdx)] || '';
            mapped[fieldKey] = cellValue;
          }
          return mapped;
        });
        setMappedRows(mappedResult);
        setStep(3); // Go directly to preview
      } catch (err) {
        console.error('Errore parsing file:', err);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Step 2 → 3: Apply mapping and create preview (with billing data extraction)
  const applyMapping = () => {
    const rows = rawData.map(row => {
      const mapped: Record<string, string> = {};
      let billingDataRaw = '';

      for (const colIdx of Object.keys(columnMapping)) {
        const fieldKey = columnMapping[colIdx];
        if (!fieldKey || fieldKey === '_skip') continue;

        const cellValue = row[parseInt(colIdx)] || '';
        if (fieldKey === '_billing_data') {
          billingDataRaw = cellValue;
        } else {
          mapped[fieldKey] = cellValue;
        }
      }

      // Post-process: extract IBAN/PayPal/P.IVA from billing data
      if (billingDataRaw) {
        const extracted = extractFromBillingData(billingDataRaw);
        // Only fill fields that aren't already mapped directly
        for (const [key, val] of Object.entries(extracted)) {
          if (val && !mapped[key]) {
            mapped[key] = val;
          }
        }
      }

      return mapped;
    });
    setMappedRows(rows);
    setStep(3);
  };

  // Step 3 → 4: Validate
  const runValidation = () => {
    const allErrors: ValidationError[] = [];
    mappedRows.forEach((row, idx) => {
      allErrors.push(...validateRow(row, idx));
    });
    setValidationErrors(allErrors);
    setStep(4);
  };

  // Step 4 → 5: Import
  const doImport = async () => {
    setIsProcessing(true);
    try {
      // Filter out rows with critical errors (missing name)
      const criticalErrorRows = new Set(
        validationErrors.filter(e => e.field === 'Nome' || e.field === 'Cognome').map(e => e.row)
      );
      const validRows = mappedRows.filter((_: Record<string, string>, idx: number) => !criticalErrorRows.has(idx + 1));

      // Send mapped JSON directly to server
      const result = await talentsApi.importMapped(validRows);
      await fetchTalents();
      setImportResult({
        ...result,
        skippedCount: criticalErrorRows.size,
        criticalErrors: validationErrors.filter(e => criticalErrorRows.has(e.row)),
      });
      setStep(5);
      onComplete(result);
    } catch (error: any) {
      setImportResult({ error: error.message });
      setStep(5);
    } finally {
      setIsProcessing(false);
    }
  };

  // Download error report as CSV
  const downloadErrorReport = () => {
    if (validationErrors.length === 0) return;
    const csvRows = [['Riga', 'Campo', 'Errore']];
    validationErrors.forEach(e => csvRows.push([String(e.row), e.field, e.message]));
    const csvContent = csvRows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'report_errori_import.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const stepTitles = ['Carica File', '', 'Anteprima', 'Validazione', 'Risultato'];
  const visibleSteps = [{ num: 1, label: 'Carica File' }, { num: 3, label: 'Anteprima' }, { num: 4, label: 'Validazione' }, { num: 5, label: 'Risultato' }];
  const mappedCount = Object.values(columnMapping).filter(v => v && v !== '_skip').length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-lg"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-3xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-tight">Importa Talenti</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">
              {step === 1 ? 'Step 1 di 4 — Carica File' :
               step === 3 ? 'Step 2 di 4 — Anteprima' :
               step === 4 ? 'Step 3 di 4 — Validazione' :
               'Step 4 di 4 — Risultato'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="px-6 pt-4 flex items-center gap-2 flex-shrink-0">
          {visibleSteps.map((vs, idx) => (
            <div key={vs.num} className="flex items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
                vs.num < step ? 'bg-emerald-500/20 text-emerald-400' :
                vs.num === step ? 'bg-blue-600 text-white' :
                'bg-zinc-900 text-zinc-600'
              }`}>
                {vs.num < step ? <Check size={12} /> : idx + 1}
              </div>
              {idx < visibleSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${vs.num < step ? 'bg-emerald-500/30' : 'bg-zinc-800'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: File Upload */}
          {step === 1 && (
            <div className="text-center py-10 space-y-6">
              <div className="w-20 h-20 bg-zinc-900 rounded-2xl flex items-center justify-center mx-auto border border-white/5">
                <Upload size={32} className="text-zinc-500" />
              </div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-widest mb-2">Carica il file</h4>
                <p className="text-xs text-zinc-500 max-w-md mx-auto">
                  Supportati: <strong className="text-zinc-300">.xlsx, .xls, .csv</strong> — il file deve seguire il <strong className="text-zinc-300">formato fisso del template</strong>. Scarica il template per avere tutte le colonne nell'ordine corretto. I campi vuoti verranno importati come vuoti e saranno sempre modificabili.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5"
                >
                  <Download size={14} /> Scarica Template
                </button>
                <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all cursor-pointer shadow-lg shadow-blue-500/20">
                  <FileText size={14} /> Seleziona File
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
              {fileName && (
                <p className="text-xs text-emerald-400 font-bold">{fileName} caricato</p>
              )}
            </div>
          )}

          {/* STEP 2: Skipped - column mapping is automatic with fixed format */}

          {/* STEP 3: Preview */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-zinc-400">
                Anteprima dei dati: <strong className="text-white">{mappedRows.length}</strong> righe trovate.
                I campi vuoti verranno importati come vuoti e saranno modificabili dal profilo del talent.
              </p>
              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-zinc-900/50 border-b border-white/5">
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">#</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cognome</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Email</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Telefono</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">IBAN</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">PayPal</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Metodo</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">P.IVA</th>
                      <th className="p-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest">C.F.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappedRows.slice(0, 50).map((row, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-zinc-900/30">
                        <td className="p-2 text-[10px] text-zinc-600 font-bold">{idx + 1}</td>
                        <td className="p-2 text-xs text-white font-bold">{row.firstName || <span className="text-red-400">—</span>}</td>
                        <td className="p-2 text-xs text-white font-bold">{row.lastName || <span className="text-red-400">—</span>}</td>
                        <td className="p-2 text-xs text-zinc-400">{row.email || <span className="text-zinc-700">vuoto</span>}</td>
                        <td className="p-2 text-xs text-zinc-400">{row.phone || <span className="text-zinc-700">vuoto</span>}</td>
                        <td className="p-2 text-xs text-zinc-400 font-mono">{row.iban ? row.iban.substring(0, 12) + '...' : <span className="text-zinc-700">vuoto</span>}</td>
                        <td className="p-2 text-xs text-zinc-400">{row.paypal_email ? 'Si' : <span className="text-zinc-700">vuoto</span>}</td>
                        <td className="p-2">
                          {row.payout_method ? (
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">{row.payout_method}</span>
                          ) : <span className="text-xs text-zinc-700">vuoto</span>}
                        </td>
                        <td className="p-2 text-xs text-zinc-400 font-mono">{row.vat || <span className="text-zinc-700">vuoto</span>}</td>
                        <td className="p-2 text-xs text-zinc-400 font-mono">{row.fiscal_code || <span className="text-zinc-700">vuoto</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mappedRows.length > 50 && (
                  <p className="p-3 text-[10px] text-zinc-600 font-bold text-center">
                    ... e altre {mappedRows.length - 50} righe
                  </p>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Validation */}
          {step === 4 && (
            <div className="space-y-4">
              {validationErrors.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle size={28} className="text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Validazione superata</h4>
                  <p className="text-xs text-zinc-500">
                    Tutte le {mappedRows.length} righe sono valide e pronte per l'importazione.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                      <AlertTriangle size={14} />
                      {validationErrors.length} avvisi in {new Set(validationErrors.map(e => e.row)).size} righe
                    </div>
                    <button
                      onClick={downloadErrorReport}
                      className="flex items-center gap-2 text-zinc-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors"
                    >
                      <Download size={12} /> Scarica report
                    </button>
                  </div>

                  <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                    {validationErrors.map((err, idx) => (
                      <div key={idx} className={`flex items-center gap-3 rounded-lg p-2.5 ${
                        err.field === 'Nome' || err.field === 'Cognome'
                          ? 'bg-red-500/5 border border-red-500/10'
                          : 'bg-amber-500/5 border border-amber-500/10'
                      }`}>
                        {err.field === 'Nome' || err.field === 'Cognome'
                          ? <XCircle size={12} className="text-red-400 flex-shrink-0" />
                          : <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />
                        }
                        <span className="text-[10px] font-bold text-zinc-500">Riga {err.row}</span>
                        <span className={`text-[10px] font-bold ${err.field === 'Nome' || err.field === 'Cognome' ? 'text-red-400' : 'text-amber-400'}`}>{err.field}</span>
                        <span className="text-xs text-zinc-400">{err.message}</span>
                      </div>
                    ))}
                  </div>

                  <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <p className="text-xs text-zinc-400">
                      <strong className="text-white">Nota:</strong> Solo le righe senza Nome/Cognome saranno saltate.
                      Tutti gli altri campi mancanti o con formato errato saranno importati comunque (il dato verrà salvato così com'è).
                    </p>
                  </div>
                </>
              )}

              <div className="flex items-center gap-4 bg-zinc-900/30 rounded-xl p-4 border border-white/5">
                <div className="text-center flex-1">
                  <p className="text-lg font-black text-emerald-400">{mappedRows.length - new Set(validationErrors.filter(e => e.field === 'Nome' || e.field === 'Cognome').map(e => e.row)).size}</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Pronte</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-lg font-black text-amber-400">{new Set(validationErrors.filter(e => e.field === 'Nome' || e.field === 'Cognome').map(e => e.row)).size}</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Saltate</p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-lg font-black text-zinc-500">{validationErrors.filter(e => e.field !== 'Nome' && e.field !== 'Cognome').length}</p>
                  <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Avvisi</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Result */}
          {step === 5 && (
            <div className="text-center py-8 space-y-6">
              {importResult?.error ? (
                <>
                  <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto">
                    <XCircle size={28} className="text-red-500" />
                  </div>
                  <h4 className="text-sm font-black text-red-400 uppercase tracking-widest">Errore Importazione</h4>
                  <p className="text-xs text-zinc-400">{importResult.error}</p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
                    <CheckCircle size={28} className="text-emerald-500" />
                  </div>
                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Importazione Completata</h4>

                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-black text-emerald-400">{importResult?.imported || 0}</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Creati</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-blue-400">{importResult?.updated || 0}</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Aggiornati</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-black text-zinc-500">{importResult?.skippedCount || 0}</p>
                      <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Saltati</p>
                    </div>
                    {(importResult?.errorCount || 0) > 0 && (
                      <div className="text-center">
                        <p className="text-2xl font-black text-red-400">{importResult.errorCount}</p>
                        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Errori</p>
                      </div>
                    )}
                  </div>

                  {importResult?.credentials && importResult.credentials.length > 0 && (
                    <div className="text-left bg-zinc-900/50 rounded-xl p-4 border border-emerald-500/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Credenziali Generate</p>
                        <button
                          onClick={() => {
                            const csvRows = [['Nome', 'Email', 'Password']];
                            importResult.credentials.forEach((c: any) => csvRows.push([c.name, c.email, c.password]));
                            const csvContent = csvRows.map((r: string[]) => r.map(c => `"${c}"`).join(',')).join('\n');
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'credenziali_talenti.csv';
                            link.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="flex items-center gap-1.5 text-[9px] font-black text-emerald-500 uppercase tracking-widest hover:text-white transition-all"
                        >
                          <Download size={11} /> Scarica CSV
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {importResult.credentials.map((cred: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 bg-zinc-800/50 rounded-lg px-3 py-2 border border-white/5">
                            <span className="text-xs font-bold text-white flex-1 truncate">{cred.name}</span>
                            <span className="text-xs text-zinc-400 truncate max-w-[180px]">{cred.email}</span>
                            <span className="text-xs text-emerald-400 font-mono font-bold select-all">{cred.password}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-zinc-600 font-bold">Salva o condividi queste credenziali — i talent potranno cambiarle dal proprio profilo.</p>
                    </div>
                  )}

                  {importResult?.errors && importResult.errors.length > 0 && (
                    <div className="text-left bg-zinc-900/50 rounded-xl p-4 border border-white/5 max-h-40 overflow-y-auto">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Errori dal server:</p>
                      {importResult.errors.map((err: string, i: number) => (
                        <p key={i} className="text-xs text-red-400">{err}</p>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="p-6 border-t border-white/5 flex items-center justify-between flex-shrink-0">
          <div>
            {step === 3 && (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <ChevronLeft size={14} /> Carica altro file
              </button>
            )}
            {step === 4 && (
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-2 text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                <ChevronLeft size={14} /> Indietro
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {step === 5 ? (
              <button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                Chiudi
              </button>
            ) : step === 3 ? (
              <button
                onClick={runValidation}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-blue-500/20"
              >
                Valida <ChevronRight size={14} />
              </button>
            ) : step === 4 ? (
              <button
                onClick={doImport}
                disabled={isProcessing}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20"
              >
                {isProcessing ? (
                  <><Loader2 size={14} className="animate-spin" /> Importazione...</>
                ) : (
                  <><Check size={14} /> Importa {mappedRows.length - new Set(validationErrors.filter(e => e.field === 'Nome' || e.field === 'Cognome').map(e => e.row)).size} talenti</>
                )}
              </button>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ============== MAIN ROSTER COMPONENT ==============
const Roster: React.FC = () => {
  const { talents, addTalent, fetchTalents } = useApp();
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const navigate = useNavigate();

  const filteredTalents = useMemo(() => talents.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      t.firstName.toLowerCase().includes(q) ||
      t.lastName.toLowerCase().includes(q) ||
      (t.stageName && t.stageName.toLowerCase().includes(q)) ||
      t.email.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    return matchSearch && matchStatus;
  }), [talents, search, statusFilter]);

  // New talent form
  const emptyForm = { firstName: '', lastName: '', stageName: '', email: '', phone: '' };
  const [newTalent, setNewTalent] = useState(emptyForm);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
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
      } as Omit<typeof talents[0], 'id'>);
      setShowAddModal(false);
      if (result.credentials) setCreatedCredentials(result.credentials);
      setNewTalent(emptyForm);
    } catch (error) {
      console.error('Failed to add talent:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase">Roster</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">
            {talents.length} talent &middot; {talents.filter(t => t.status === 'active').length} attivi
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5"
          >
            <Download size={14} /> Template
          </button>
          <button
            onClick={() => setShowImportWizard(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5"
          >
            <FileText size={14} /> Importa
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-blue-500/20"
          >
            <UserPlus size={14} /> Nuovo Talento
          </button>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-2.5 focus-within:border-blue-500/50 transition-all">
          <Search size={16} className="text-zinc-600 mr-3" />
          <input
            type="text"
            placeholder="Cerca talento..."
            className="bg-transparent border-none text-xs text-white placeholder-zinc-600 w-full font-bold outline-none"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-zinc-600 hover:text-white">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="flex items-center bg-zinc-900/50 p-1 rounded-xl border border-white/5">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                statusFilter === s ? 'bg-blue-600 text-white shadow-lg' : 'text-zinc-500 hover:text-white'
              }`}
            >
              {s === 'all' ? 'Tutti' : s === 'active' ? 'Attivi' : 'Inattivi'}
            </button>
          ))}
        </div>
      </div>

      {/* Flashcard Grid - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {filteredTalents.map((talent, idx) => (
          <motion.div
            key={talent.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.02 }}
            onClick={() => navigate(`/roster/${talent.id}`)}
            className="bg-[#0c0c0c] border border-white/5 rounded-2xl p-3 cursor-pointer hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border-2 border-white/5 group-hover:border-blue-500/30 transition-all">
                {talent.photoUrl ? (
                  <img src={talent.photoUrl} className="w-full h-full object-cover" alt="" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-sm font-black uppercase">
                    {talent.firstName.charAt(0)}{talent.lastName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white truncate leading-tight group-hover:text-blue-400 transition-colors">
                  {talent.firstName} {talent.lastName}
                </p>
                {talent.stageName && (
                  <p className="text-[10px] text-zinc-500 truncate">{talent.stageName}</p>
                )}
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider ${
                  talent.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-red-500/10 text-red-400'
                }`}>
                  {talent.status === 'active' ? 'Attivo' : 'Inattivo'}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredTalents.length === 0 && (
        <div className="py-20 text-center">
          <UserPlus size={48} className="mx-auto text-zinc-800 mb-4" />
          <p className="text-sm font-black text-zinc-600 uppercase tracking-widest">Nessun talento trovato</p>
          <p className="text-xs text-zinc-700 mt-2">Prova a modificare i filtri o aggiungi un nuovo talento</p>
        </div>
      )}

      {/* Import Wizard */}
      <AnimatePresence>
        {showImportWizard && (
          <ImportWizard
            onClose={() => { setShowImportWizard(false); fetchTalents(); }}
            onComplete={() => fetchTalents()}
          />
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-lg"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-lg shadow-3xl overflow-hidden"
            >
              <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Nuovo Talento</h3>
                  <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-zinc-900 rounded-xl text-zinc-500 hover:text-white transition-all">
                    <X size={18} />
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleAdd}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Nome *</label>
                      <input
                        type="text" required
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                        value={newTalent.firstName}
                        onChange={e => setNewTalent({ ...newTalent, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Cognome *</label>
                      <input
                        type="text" required
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                        value={newTalent.lastName}
                        onChange={e => setNewTalent({ ...newTalent, lastName: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Nome d'arte</label>
                    <input
                      type="text"
                      className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                      placeholder="Opzionale"
                      value={newTalent.stageName}
                      onChange={e => setNewTalent({ ...newTalent, stageName: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Email *</label>
                      <input
                        type="email" required
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                        value={newTalent.email}
                        onChange={e => setNewTalent({ ...newTalent, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block mb-1">Telefono</label>
                      <input
                        type="tel"
                        className="w-full bg-zinc-900/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white font-bold focus:border-blue-500/50 focus:outline-none"
                        placeholder="+39..."
                        value={newTalent.phone}
                        onChange={e => setNewTalent({ ...newTalent, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-widest py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20 mt-2"
                  >
                    {isSubmitting ? 'Creazione...' : 'Crea Talento'}
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credentials Modal */}
      <AnimatePresence>
        {createdCredentials && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/80 backdrop-blur-lg" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#0c0c0c] border border-white/10 rounded-3xl w-full max-w-md shadow-3xl overflow-hidden p-8 text-center"
            >
              <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check size={28} className="text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Talento Creato</h3>
              <p className="text-xs text-zinc-500 mb-6">Credenziali di accesso — condividile subito</p>

              <div className="bg-zinc-900/50 rounded-xl p-5 border border-white/5 space-y-3 text-left mb-6">
                <div>
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Email</p>
                  <p className="text-sm font-bold text-white select-all">{createdCredentials.email}</p>
                </div>
                <div className="border-t border-white/5 pt-3">
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Password</p>
                  <p className="text-sm font-bold text-white select-all font-mono">{createdCredentials.password}</p>
                </div>
              </div>

              <button
                onClick={() => setCreatedCredentials(null)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all"
              >
                Ho Salvato le Credenziali
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Roster;
