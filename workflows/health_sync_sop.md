# SOP: Standard Operating Procedure — Health & Wearables Synchronization

Questa procedura operativa standard definisce le regole e il flusso di sincronizzazione dei dati di salute e attività fisica (Apple HealthKit / Google Health Connect) nell'app MealPulse AI, in conformità con l'architettura WAT (`GEMINI.md`).

---

## 1. Obiettivo

Sincronizzare in modo affidabile, deterministico e trasparente i dati di:
- **Active Energy Burned (Calorie Attive Bruciate)**
- **Steps (Passi Giornalieri)**
- **Active Workout Minutes (Minuti di Esercizio Fisico)**

provenienti da smartwatch/wearables (Apple Watch, Wear OS, Garmin, Fitbit, Samsung Health collegati al sistema operativo) e ricalcolare il budget calorico giornaliero residuo.

---

## 2. Architettura del Flusso (WAT)

```text
[Wearable / Sensor]
        ↓
[OS Health Framework (HealthKit / Health Connect)]
        ↓
[HealthSyncService (TypeScript Bridge & Validation)]
        ↓
 ┌─────────────────────────┴─────────────────────────┐
 ↓                                                   ↓
[Local State / AsyncStorage]             [Supabase: daily_activity_logs]
 (Update UI / Calorie Budget)             (Upsert: user_id + log_date)
```

---

## 3. Requisiti di Permessi & Privacy

### iOS (HealthKit)
- Chiavi in `Info.plist` / `app.json`:
  - `NSHealthShareUsageDescription`: Spiega all'utente perché l'app richiede la lettura delle calorie attive e dei passi per calcolare il bilancio nutrizionale.
  - `NSHealthUpdateUsageDescription`: Descrizione per l'aggiornamento (se richiesto).

### Android (Health Connect)
- Dichiarazioni in `AndroidManifest.xml`:
  - `android.permission.health.READ_ACTIVE_CALORIES_BURNED`
  - `android.permission.health.READ_STEPS`
  - `android.permission.health.READ_EXERCISE`
- Intent Filter: `androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE`
- Pacchetto Health Connect: `com.google.android.apps.healthdata`

---

## 4. Logica di Ricalcolo Fabbisogno

Il target calorico giornaliero si aggiorna secondo la formula:

$$\text{Calorie Rimanenti} = \begin{cases} \max(0, \text{Target Base} - \text{Calorie Assunte} + \text{Calorie Attive}) & \text{se includeBurnedInBudget == true} \\ \max(0, \text{Target Base} - \text{Calorie Assunte}) & \text{se includeBurnedInBudget == false} \end{cases}$$

---

## 5. Deduplicazione e Persistenza

Per prevenire duplicati o discrepanze derivanti da sync multipli nel corso della giornata:
1. La tabella Supabase `daily_activity_logs` impone il vincolo `UNIQUE(user_id, log_date)`.
2. Ogni operazione di scrittura viene eseguita tramite `upsert` con conflitto su `(user_id, log_date)`.
3. Lo stato locale in `AsyncStorage` viene indicizzato per data `YYYY-MM-DD`.

---

## 6. Gestione Errori e Edge Cases

| Scenario | Azione / Comportamento |
|---|---|
| Permesso negato dall'utente | Mostra badge *"Non autorizzato"*, non bloccare l'app, consenti inserimento manuale o disattiva il sync. |
| Health Connect non installato (Android < 14) | Apri il Play Store con link al download di Google Health Connect o offri fallback manuale. |
| Nessun dato registrato oggi | Imposta `burnedCalories = 0` senza errori bloccanti. |
| Dispositivo offline | Salva l'attività in `AsyncStorage` e accoda l'upsert su Supabase al ripristino della connessione. |
