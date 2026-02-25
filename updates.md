[21/02/26, 17:06:20] Samuele Gianniliv: HARD CONSTRAINT: Do NOT create ANY KPI/stat summary cards, dashboards, widgets, or metric tiles on the Home page under any circumstances. If any exist, remove them. The Home page must ONLY contain the 4 task sections + the calendar (and the pinned notes area inside the last section).

You are modifying an existing app. Update ONLY the Home page (currently a generic “Dashboard” with KPI cards and a task list) to match this exact layout and behavior. Do not change the data model unless strictly needed.

LANGUAGE REQUIREMENT (MANDATORY)
•⁠  ⁠All UI text must be in ITALIAN: page title, section titles, buttons, labels, tabs, placeholders, empty-state messages, toasts/notifications, modal titles, field names (where visible), and any helper text.
•⁠  ⁠Do NOT leave any English words in the UI.

GOAL: Replace the KPI-card dashboard with a task-operational Home: logo + 4 task columns (Oggi / Domani / Dopodomani / Urgenze & Prossima settimana) that sit ABOVE/OUTSIDE the calendar (not inside it), plus a standard calendar view.

1) REMOVE CURRENT HOME CONTENT
•⁠  ⁠Remove the KPI cards (Active Talents, Active Campaigns, Clients, Pending Tasks).
•⁠  ⁠Remove any “Dashboard” card-based layout.
•⁠  ⁠Keep the global top bar and the existing “New Task” action, but rewire it to the new task flow described below.
•⁠  ⁠Rename the page title from “Dashboard” to “Home” (Italian UI: you may use “Home” or “Pagina iniziale” — pick ONE and use it consistently).

2) NEW HOME LAYOUT (PIXEL-LOGIC, NOT GENERIC)
•⁠  ⁠Page header: show the Advenire logo on the left and the page title in Italian.
•⁠  ⁠Main content uses a 2-column grid:
  LEFT COLUMN (Task Columns block, fixed width):
    - Create 4 stacked sections in this exact order, with titles in Italian and uppercase:
      A) OGGI
      B) DOMANI
      C) DOPODOMANI
      D) URGENZE & PROSSIMA SETTIMANA
    - These sections are NOT part of the calendar. They must live in the left column, separate from calendar UI.
  RIGHT COLUMN (Calendar block, fluid width):
    - Show a standard calendar component (monthly by default). It must display tasks on their due_date.

3) TASK DATA SOURCE + FILTERING RULES
Use the existing Tasks collection/table.
•⁠  ⁠OGGI: tasks where due_date = today and status != done.
•⁠  ⁠DOMANI: tasks where due_date = today+1 and status != done.
•⁠  ⁠DOPODOMANI: tasks where due_date = today+2 and status != done.
•⁠  ⁠URGENZE & PROSSIMA SETTIMANA: show two subtabs inside this section (tab titles in Italian):
   Tab 1 “URGENTI / SCADUTE”: tasks where priority = urgent OR due_date < today, and status != done.
   Tab 2 “PROSSIMI 7 GIORNI”: tasks where due_date between today and today+7, and status != done.
Additionally, add a small “Note fissate” area inside this section (editable multiline notes) saved in a simple HomeNotes table:
•⁠  ⁠HomeNotes fields: id, note_text, updated_at
•⁠  ⁠One note record is enough (single global note for this Home section).
All labels for this notes area must be in Italian (e.g., “NOTE FISSATE”, “Modifica”, “Salva”).

4) INTERACTIONS (MUST BE FULLY CLICKABLE)
•⁠  ⁠Every task item in any section is clickable: click opens a Task Details drawer/modal.
•⁠  ⁠Task Details supports (all UI text in Italian): edit title/description, change status, change priority, change due_date, delete, and “Mark as done”.
  Italian equivalents to use consistently:
  - “Dettagli attività”
  - “Modifica”
  - “Elimina”
  - “Segna come completata”
  - “Salva”
•⁠  ⁠When a task is updated, it must instantly move to the correct section and update the calendar view.

5) QUICK ADD (VERY IMPORTANT)
At the top of each of the 4 sections, add a “Quick Add” row (UI in Italian):
•⁠  ⁠Input placeholder: “Aggiungi attività…”
•⁠  ⁠Optional: small priority selector default = “Bassa”.
•⁠  ⁠On Enter/Add:
  - Create a task with due_date prefilled based on the section:
    OGGI -> today
    DOMANI -> today+1
    DOPODOMANI -> today+2
    URGENZE & PROSSIMA SETTIMANA -> today (but default priority = urgent)
•⁠  ⁠After creation, show it immediately in the list.

6) CALENDAR BEHAVIOR
•⁠  ⁠Calendar shows tasks on their due_date (small clickable chips/items).
•⁠  ⁠Clicking a calendar item opens Task Details.
•⁠  ⁠Drag & drop moving a task to another date updates due_date and immediately updates the left sections.
•⁠  ⁠Provide simple filters above the calendar (labels in Italian):
  - status filter (Da fare / In corso / Completate)
  - priority filter (Bassa / Media / Alta / Urgente)
  - optional “Collegato a” filter (Tutti / Campagna / Talent / Cliente) if those fields already exist.

7) NEW TASK BUTTON
•⁠  ⁠Keep the top-right button but change its label to Italian:
  - “Nuova attività”
•⁠  ⁠It opens the full New Task modal (Italian UI title: “Nuova attività”).
•⁠  ⁠When saved, the task must appear both in the appropriate left section and on the calendar.

8) STYLE / UX CONSTRAINTS
•⁠  ⁠No KPI cards on Home (strictly forbidden by the HARD CONSTRAINT).
•⁠  ⁠The left 4 sections must be clearly separated, with section titles in uppercase (Italian).
•⁠  ⁠Keep it clean and readable, optimized for fast operational use.

DELIVERABLE
After applying changes, the Home page must exactly be:
•⁠  ⁠Left: 4 sections (OGGI/DOMANI/DOPODOMANI/URGENZE & PROSSIMA SETTIMANA with subtabs + note fissate)
•⁠  ⁠Right: calendar
•⁠  ⁠Everything clickable, with quick add in each section, and tasks synchronized between lists and calendar.
•⁠  ⁠All UI text in Italian, no English strings anywhere.
[21/02/26, 17:06:20] Samuele Gianniliv: HARD CONSTRAINTS (NON-NEGOTIABLE)
1) All UI text must be in ITALIAN only (titles, buttons, labels, tabs, placeholders, toasts, empty states). No English UI strings anywhere.
2) The Roster flashcards MUST be COMPACT (not large). Do not create big tiles or oversized cards.

SCOPE: Build/Update ONLY the “Roster” module and Talent Detail pages for this first phase, following the user’s original requirements. No KPI dashboards, no extra modules.

A) ROSTER PAGE (Grid di flashcard COMPATTE)
Create a “Roster” page showing a grid of clickable flashcards for Talenti.

FLASHCARD SIZE + DENSITY (mandatory)
•⁠  ⁠Card height target: ~120–150px (compact).
•⁠  ⁠Card max width target: ~200–240px (compact).
•⁠  ⁠Minimal padding: ~10–12px.
•⁠  ⁠Profile photo thumbnail: 52–64px (circle or rounded square).
•⁠  ⁠Do NOT add large banners, wide cover images, or big empty spacing.

GRID RULES
•⁠  ⁠Desktop: show a dense grid (ideally 4–6 cards per row depending on screen width).
•⁠  ⁠Tablet: 3–4 per row.
•⁠  ⁠Mobile: 2 per row.
•⁠  ⁠Maintain consistent spacing and avoid oversized typography.

CARD CONTENT (only what’s needed)
Each flashcard MUST show:
•⁠  ⁠Foto profilo (thumbnail)
•⁠  ⁠Nome e Cognome (full name)
•⁠  ⁠Badge stato: “Attivo” / “Non attivo”
Optional (small, not dominant): one-line note snippet.

ACTIONS ON ROSTER PAGE
•⁠  ⁠Search bar: “Cerca talento…” (search by name)
•⁠  ⁠Filters: “Attivo / Non attivo”
•⁠  ⁠Primary buttons at top: “Nuovo talento” and “Importa Excel”
•⁠  ⁠Clicking a card opens the Talent Detail page (no dead ends).

B) TALENT DETAIL PAGE (Tabs, completo come richiesto)
Create a Talent detail page with a clean header:
•⁠  ⁠Foto profilo + Nome e Cognome
•⁠  ⁠Quick actions: “Modifica”, “Assegna a campagna”, “Copia tutti i social”, “Copia dati fatturazione”

Tabs (Italian labels):
1) “Panoramica”
2) “Foto”
3) “Dati anagrafici”
4) “Pagamenti e fatturazione”
5) “Social”
6) “Indirizzo”
7) “Mini-dashboard”
8) “Note”

C) FOTO (Foto profilo + galleria)
In “Foto” tab:
•⁠  ⁠Upload/replace Foto profilo
•⁠  ⁠Upload multiple images for “Galleria”
•⁠  ⁠Reorder gallery (drag & drop if supported)
•⁠  ⁠Delete images
Card thumbnails must update immediately when profile photo changes.

D) DATI ANAGRAFICI
In “Dati anagrafici” tab, editable fields:
•⁠  ⁠Nome, Cognome (required)
•⁠  ⁠Telefono, Email
Validation:
•⁠  ⁠Nome e Cognome obbligatori
•⁠  ⁠Email, se presente, deve essere valida

E) INDIRIZZO
In “Indirizzo” tab, editable fields:
•⁠  ⁠Via e numero, Città, CAP, Paese
Keep it simple and editable.

F) PAGAMENTI E FATTURAZIONE (come richiesto)
In “Pagamenti e fatturazione” tab:
•⁠  ⁠Metodo pagamento: “IBAN”, “PayPal”, “Entrambi”
•⁠  ⁠Conditional fields:
  - IBAN (+ nome banca opzionale)
  - Email PayPal
  - P.IVA (opzionale)
  - Codice Fiscale (opzionale)
  - Dati intestazione fatturazione (Nome intestatario, indirizzo fatturazione completo)
Add button: “Copia dati fatturazione”
•⁠  ⁠Copies a formatted text block to clipboard with all available billing/payment data.

G) SOCIAL (copiabili in elenco, uno sotto l’altro)
In “Social” tab:
•⁠  ⁠TikTok URL, Instagram URL, YouTube URL, Twitch URL
•⁠  ⁠“Altri social” multiline
Render a “Box copiabile” always visible that outputs:
•⁠  ⁠A clean multiline list, one link per line, with labels optional but consistent.
Add button: “Copia tutti i social” to copy that exact multiline output.

H) MINI-DASHBOARD (piccolo, non invasivo)
In “Mini-dashboard” tab (simple, small):
•⁠  ⁠Conteggio campagne collegate
•⁠  ⁠Conteggio attività collegate
•⁠  ⁠Ultimo aggiornamento
No large KPI cards; keep it minimal.

I) AZIONE OPERATIVA: ASSEGNA A CAMPAGNA (fondamentale)
Add a button “Assegna a campagna” on Talent detail:
•⁠  ⁠Opens a modal with:
  - Select campaign (dropdown searchable)
  - Field: “Compenso lordo”
  - Save creates/updates the relationship record (CampaignTalents)
IMPORTANT: selection must always be by FULL NAME + photo, never by codes like T01/T02.

DELIVERABLE
After implementing, the Roster is a dense grid of small flashcards and every talent has a complete editable profile (photo+gallery, anagrafica, pagamenti, social copiabili, indirizzo, mini-dashboard, note), and can be assigned to campaigns by name.
[21/02/26, 17:06:20] Samuele Gianniliv: HARD CONSTRAINTS (NON-NEGOTIABLE)
1) All UI text must be in ITALIAN only. No English UI strings anywhere.
2) This feature must be fully clickable end-to-end with clear preview and error reporting (no silent failures).
3) Do NOT create new unrelated pages/modules. Work within Roster.

Implement the “Importa Excel” feature in the Roster page to create/update Talenti + Social + Pagamenti.

A) TEMPLATE EXCEL (scaricabile)
Provide a “Scarica template Excel” button that downloads an .xlsx template with ONE single sheet and these columns (use exact column keys internally, show Italian column labels in the file header if possible):

REQUIRED
•⁠  ⁠first_name (Nome) [required]
•⁠  ⁠last_name (Cognome) [required]

OPTIONAL (Talento)
•⁠  ⁠display_name (Nome visualizzato)
•⁠  ⁠status (Attivo/Non attivo) default Attivo
•⁠  ⁠phone (Telefono)
•⁠  ⁠email (Email)
•⁠  ⁠address_street (Via e numero)
•⁠  ⁠address_city (Città)
•⁠  ⁠address_zip (CAP)
•⁠  ⁠address_country (Paese)
•⁠  ⁠notes (Note)

OPTIONAL (Social)
•⁠  ⁠tiktok_url
•⁠  ⁠instagram_url
•⁠  ⁠youtube_url
•⁠  ⁠twitch_url
•⁠  ⁠other_socials_multiline (Altri social)

OPTIONAL (Pagamenti/Fatturazione)
•⁠  ⁠payout_method (IBAN/PayPal/Entrambi)
•⁠  ⁠iban
•⁠  ⁠paypal_email
•⁠  ⁠vat_number (P.IVA)
•⁠  ⁠fiscal_code (Codice Fiscale)
•⁠  ⁠billing_name (Intestatario fatturazione)
•⁠  ⁠billing_address_street
•⁠  ⁠billing_address_city
•⁠  ⁠billing_address_zip
•⁠  ⁠billing_address_country

OPTIONAL (immagini da URL)
•⁠  ⁠profile_photo_url (URL foto profilo)
•⁠  ⁠gallery_urls (URL galleria separati da virgola)

B) FLUSSO IMPORT (step-by-step, UI in italiano)
From button “Importa Excel”, open a modal wizard with steps:
1) Caricamento file (.xlsx)
2) Mappatura colonne (auto-map by header name; allow manual mapping)
3) Anteprima import (table preview of parsed rows)
4) Validazione (show error list per-row, per-field)
5) Conferma “Importa”

C) VALIDAZIONE (obbligatoria)
•⁠  ⁠Nome e Cognome obbligatori
•⁠  ⁠Email se presente deve essere valida
•⁠  ⁠payout_method se presente deve essere uno tra: IBAN, PayPal, Entrambi
•⁠  ⁠IBAN required if payout_method includes IBAN
•⁠  ⁠PayPal email required if payout_method includes PayPal

D) DEDUP + UPDATE RULE (anti duplicati)
On import, for each row:
•⁠  ⁠If an existing talent matches by email OR phone, UPDATE that existing talent (no duplicates).
•⁠  ⁠Otherwise CREATE a new talent.
For updates:
•⁠  ⁠Only overwrite fields that are NON-empty in Excel (do not delete existing values with blanks).
•⁠  ⁠Create/update linked TalentSocials and TalentPayments accordingly.

E) IMMAGINI DA URL
If profile_photo_url is provided:
•⁠  ⁠fetch and set as Foto profilo for that talent.
If gallery_urls is provided:
•⁠  ⁠fetch and attach all images to the gallery.
If a URL fails, log an error for that row but continue importing other fields.

F) RISULTATO IMPORT (report chiaro)
After confirm, show a summary panel:
•⁠  ⁠“Creati: X”
•⁠  ⁠“Aggiornati: Y”
•⁠  ⁠“Saltati: Z”
•⁠  ⁠“Errori: N”
Provide “Scarica report errori” as CSV/XLSX with row number + reason.

DELIVERABLE
At the end, the user can mass-populate the roster reliably via Excel with preview, dedup, and clear error handling.
[21/02/26, 17:06:20] Samuele Gianniliv: HARD CONSTRAINTS (NON-NEGOTIABLE)
1) All UI text must be in ITALIAN only. No English UI strings anywhere.
2) Talents must ALWAYS be selected by FULL NAME + photo. Never show codes like T01/T02.
3) Keep scope to the first phase: campaign creation + linking talents + linking/creating clients + basic detail page.

Build/Update the “Campagne” module.

A) PAGINA “Campagne” (lista cliccabile)
•⁠  ⁠Create a table/list with columns:
  - Tipo (Suono/Brand)
  - Nome campagna
  - Cliente
  - Budget
  - Stato (Bozza/Attiva/Chiusa)
  - Data inizio, Data fine
•⁠  ⁠Add search (Nome campagna / Cliente) and filters (Tipo, Stato).
•⁠  ⁠Clicking a row opens the “Dettaglio campagna”.

B) WIZARD “Nuova campagna” (step-by-step)
Button: “Nuova campagna”
Steps:
1) Tipo campagna: “Suono” or “Brand”
2) Dati campagna: Nome campagna, Budget totale, Data inizio, Data fine, Note
3) Cliente:
   - Select existing client (searchable dropdown)
   - OR “Crea nuovo cliente” inline (min fields: Tipo, Ragione sociale, Referente, Email, Telefono)
4) Seleziona talenti:
   - Multi-select searchable list
   - Each item shows FOTO + NOME E COGNOME
   - Multi-click select many, show selected list with remove option
5) Compensi talent:
   - For each selected talent, set “Compenso lordo”
   - Show “Totale compensi” and “Budget residuo” live
Rule:
•⁠  ⁠If Totale compensi > Budget totale, block finish and show warning in Italian.

Finish creates:
•⁠  ⁠Campaigns record
•⁠  ⁠CampaignTalents records for each selected talent (with compenso)
•⁠  ⁠Links to the selected/created client

C) DETTAGLIO CAMPAGNA (completamente cliccabile)
Dettaglio campagna must show:
•⁠  ⁠Header: Nome, Tipo, Stato, Budget, Cliente, Date
•⁠  ⁠Tabs/sections:
  1) “Panoramica” (note + info)
  2) “Talenti” (editable list: foto+nome, compenso lordo, stato talent: Invitato/Confermato/Consegnato/Pagato, note)
  3) “Cliente” (link to dettaglio cliente)
  4) “Attività” (tasks linked to this campaign + button “Nuova attività collegata”)
Buttons:
•⁠  ⁠“Modifica campagna”
•⁠  ⁠“Aggiungi talenti” (reuse the multi-select)
•⁠  ⁠“Chiudi campagna” (when closed, prevent editing fees and talent list)

DELIVERABLE
Campaigns can be created quickly, linked to clients, linked to multiple talents by name/photo, and opened/edited with no dead ends.
[21/02/26, 17:06:20] Samuele Gianniliv: HARD CONSTRAINTS (NON-NEGOTIABLE)
1) All UI text must be in ITALIAN only. No English UI strings anywhere.
2) Keep scope to the first phase: clients registry + detail + campaigns linkage + used in campaign wizard.

Build/Update the “Clienti” module.

A) PAGINA “Clienti”
•⁠  ⁠Create a table/list with columns:
  - Tipo
  - Ragione sociale
  - Referente
  - Email
  - Telefono
  - Note
•⁠  ⁠Search: Ragione sociale and Referente
•⁠  ⁠Filter by Tipo
•⁠  ⁠Row click opens “Dettaglio cliente”
•⁠  ⁠Button: “Nuovo cliente”

B) DETTAGLIO CLIENTE (cliccabile)
•⁠  ⁠Editable client fields (all Italian labels)
•⁠  ⁠Section “Campagne collegate” listing all campaigns for this client (clickable to campaign detail)
•⁠  ⁠Button “Crea campagna per questo cliente”:
  - opens the campaign wizard with this client pre-selected

C) INTEGRAZIONE CON WIZARD CAMPAGNE
•⁠  ⁠Ensure the “Crea nuovo cliente” inline flow inside the campaign wizard saves the client into this Clients registry.
•⁠  ⁠No data loss when moving back/forward in the wizard.

DELIVERABLE
Clients can be created, viewed, edited, and used during campaign creation; every campaign and client link is clickable.

Quando si crea la pagina roster, quindi quando clicco su un talent, ci deve essere una sezione finanze anche per lei dove c’è un recap di tutte le campagne che ha fatto e sapere quali campagne gli devo ancora saldare, con un copia e incolla dove escono le campagne saldate e quelle da saldare. Tutti i dati possibili devopreventivatorertabili con filtri formattati bene per whatsapp. 
Per quanto riguarda il preventivatore non serve solo per le campagne, ma anche per progetti più piccoli, deve gestire tutti i tipi di preventivi fattibili. 