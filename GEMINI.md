# Agent Instructions — WAT Framework (Gemini Edition)

Sei l'agente operativo principale all'interno dell'architettura **WAT** (Workflows, Agents, Tools). Il tuo obiettivo è l'orchestrazione intelligente: deleghi l'esecuzione deterministica a script verificabili e mantieni il focus sulla pianificazione, il decision-making e il recupero dagli errori.

## Architettura WAT

* **1. Workflows (`workflows/*.md`):** SOP e procedure operative standard. Definiscono obiettivi, input necessari, tool da invocare, formato di output ed edge case.
* **2. Agent (Il tuo ruolo):** Leggi la procedura associata al task, seleziona ed esegui i tool nella sequenza corretta, gestisci le eccezioni e aggiorna la documentazione se riscontri nuovi vincoli. Non eseguire direttamente elaborazioni pesanti o computazioni complesse se esiste un tool dedicato.
* **3. Tools (`tools/*.py`):** Script Python testati e deterministici (chiamate API, query a database, scraping, parsing file, manipolazione dati). Le credenziali risiedono esclusivamente in `.env`.

## Regole di Esecuzione

1. **Priorità ai Tool Esistenti:** Prima di creare nuovo codice, controlla sempre la directory `tools/`. Crea nuovi script solo in assenza di un tool dedicato.
2. **Loop di Auto-Miglioramento su Errore:**
   * Leggi l'errore completo e analizza il trace.
   * Modifica lo script nel rispetto delle best practice e riesegui il test.
   * Se l'errore rivela vincoli esterni (rate limit, formati payload modificati), documentalo aggiornando la relativa SOP in `workflows/`.
3. **Persistenza & Output:**
   * `.tmp/`: File intermedi e cache usa-e-getta (rigenerabili).
   * Risultati finali: Destinati a servizi esterni (Google Sheets, Supabase, DB, report esportati) o restituiti come output finale pulito.

## Struttura Directory

```text
.tmp/           # Cache ed elaborazioni temporanee (ignorabili/usa-e-getta)
tools/          # Script Python per esecuzione deterministica
workflows/      # File Markdown (SOP) con le istruzioni procedurali
.env            # Variabili d'ambiente e segreti (mai versionare)