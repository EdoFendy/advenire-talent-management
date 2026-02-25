// Script di conversione: CSV vecchio formato → XLSX formato template wizard
import * as XLSX from 'xlsx';
import fs from 'fs';

const csvPath = './uploads/Dati_influencer__CSV_.csv';
const outputPath = './uploads/talenti_importabili.xlsx';

// Read and parse CSV
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV handling quoted fields
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { field += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) { row.push(field.trim()); field = ''; }
    else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (field || row.length > 0) {
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
      }
      if (char === '\r' && nextChar === '\n') i++;
    } else field += char;
  }
  if (field || row.length > 0) { row.push(field.trim()); rows.push(row); }
  return rows;
}

const allRows = parseCSV(csvContent);
// Skip header row
const dataRows = allRows.slice(1).filter(r => r.length >= 2 && r[0]);

console.log(`Trovate ${dataRows.length} righe da convertire.\n`);

// Extract IBAN from mixed billing data
function extractIBAN(text) {
  if (!text) return '';
  const match = text.match(/IT\s*[0-9A-Z]{2}\s*[A-Z0-9]\s*[0-9\s]{10,30}/i);
  if (match) return match[0].replace(/\s/g, '');
  return '';
}

// Extract PayPal from mixed billing data
function extractPayPal(text) {
  if (!text) return '';
  const match = text.match(/paypal\.me\/([^\s;,]+)/i);
  if (match) return match[0];
  // Also check for revolut
  const revolut = text.match(/revolut\.me\/([^\s;,]+)/i);
  if (revolut) return revolut[0];
  return '';
}

// Extract P.IVA (11-digit number, possibly with "P.IVA" prefix)
function extractPIVA(text) {
  if (!text) return '';
  const match = text.match(/(?:P\.?\s*IVA|Partita\s+IVA)[:\s]*([0-9]{11})/i);
  if (match) return match[1];
  // Standalone 11-digit that's not part of IBAN
  return '';
}

// Extract billing name from billing data (e.g. "IT... (Flavia Sodano)" or "Cudia Miriam; IBAN: ...")
function extractBillingName(text) {
  if (!text) return '';
  const parenMatch = text.match(/\(([A-Za-zÀ-ú\s]+)\)/);
  if (parenMatch) return parenMatch[1].trim();
  // If starts with a name before IBAN/paypal
  const nameFirst = text.match(/^([A-Za-zÀ-ú\s]{3,30})\s*[;:]/);
  if (nameFirst) return nameFirst[1].trim();
  return '';
}

// Determine payout method
function getPayoutMethod(text) {
  const hasIBAN = !!extractIBAN(text);
  const hasPayPal = !!extractPayPal(text);
  if (hasIBAN && hasPayPal) return 'Entrambi';
  if (hasIBAN) return 'IBAN';
  if (hasPayPal) return 'PayPal';
  return '';
}

// Parse address: try to extract via, city, cap
function parseAddress(text) {
  if (!text) return { street: '', city: '', zip: '', country: 'Italia' };

  // Try to extract CAP (5 digits)
  const capMatch = text.match(/\b(\d{5})\b/);
  const cap = capMatch ? capMatch[1] : '';

  // The rest is the full address, we keep it simple
  return {
    street: text,
    city: '',
    zip: cap,
    country: 'Italia'
  };
}

// Convert rows
const templateHeaders = [
  'Nome', 'Cognome', 'Nome d\'arte', 'Stato (active/inactive)', 'Telefono', 'Email',
  'Via', 'Città', 'CAP', 'Paese', 'Note',
  'TikTok URL', 'Instagram URL', 'YouTube URL', 'Twitch URL', 'Altri social',
  'Metodo pagamento (IBAN/PayPal/Entrambi)', 'IBAN', 'Nome banca', 'Email PayPal',
  'P.IVA', 'Codice Fiscale', 'Nome intestatario fatturazione',
  'Via fatturazione', 'Città fatturazione', 'CAP fatturazione', 'Paese fatturazione'
];

const outputRows = [templateHeaders];

for (const row of dataRows) {
  const nome = row[0] || '';
  const cognome = row[1] || '';
  const tiktokUrl = row[2] || '';
  // row[3], row[4] = followers (non mappati nel template)
  const instagramUrl = row[5] || '';
  // row[6], row[7] = instagram followers
  const billingData = row[8] || '';
  const billingAddress = row[9] || '';
  const shippingAddress = row[10] || '';
  const email = row[11] || '';
  const phone = row[12] || '';
  const notes = row[13] || '';

  const address = parseAddress(shippingAddress || billingAddress);
  const iban = extractIBAN(billingData);
  const paypal = extractPayPal(billingData);
  const piva = extractPIVA(billingData);
  const billingName = extractBillingName(billingData);
  const payoutMethod = getPayoutMethod(billingData);
  const billingAddr = parseAddress(billingAddress);

  const outputRow = [
    nome,                              // Nome
    cognome,                           // Cognome
    '',                                // Nome d'arte
    'active',                          // Stato
    phone,                             // Telefono
    email,                             // Email
    address.street,                    // Via
    address.city,                      // Città
    address.zip,                       // CAP
    address.country,                   // Paese
    notes,                             // Note
    tiktokUrl,                         // TikTok URL
    instagramUrl,                      // Instagram URL
    '',                                // YouTube URL
    '',                                // Twitch URL
    '',                                // Altri social
    payoutMethod,                      // Metodo pagamento
    iban,                              // IBAN
    '',                                // Nome banca
    paypal,                            // Email PayPal
    piva,                              // P.IVA
    '',                                // Codice Fiscale
    billingName || `${nome} ${cognome}`, // Nome intestatario
    billingAddr.street,                // Via fatturazione
    billingAddr.city,                  // Città fatturazione
    billingAddr.zip,                   // CAP fatturazione
    billingAddr.country,               // Paese fatturazione
  ];

  outputRows.push(outputRow);

  console.log(`✓ ${nome} ${cognome} — IBAN: ${iban ? '✓' : '✗'} | PayPal: ${paypal ? '✓' : '✗'} | P.IVA: ${piva ? '✓' : '✗'} | Metodo: ${payoutMethod || '—'}`);
}

// Create XLSX
const ws = XLSX.utils.aoa_to_sheet(outputRows);
ws['!cols'] = templateHeaders.map(() => ({ wch: 25 }));
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Talenti');
XLSX.writeFile(wb, outputPath);

console.log(`\n✅ File creato: ${outputPath}`);
console.log(`   ${dataRows.length} talenti pronti per l'importazione via wizard.`);
