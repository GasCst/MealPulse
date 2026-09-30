# 🎙️ MealPulse AI — Voci di riferimento

Il launcher Mac usa ora Qwen3-TTS/MLX per questi cinque personaggi. I file originali
sono conservati; `references.json` abbina ritagli e trascrizioni per la clonazione.
XTTS resta disponibile per le 58 voci standard e come modalità alternativa.
Configurazione, dialetto, test e avvio: [TTS locale](../../docs/LOCAL_TTS.md).

Le sezioni XTTS sotto descrivono la modalità precedente/alternativa.

Alloggia qui i file audio `.wav` di riferimento utilizzati per il **Voice Cloning Zero-Shot** con Coqui XTTS-v2.

---

## 📁 Nomi File e Corrispondenza `voice_id`

Il `voice_id` utilizzato dall'API corrisponde al **nome del file senza estensione** (`.wav`):

| File Audio | `voice_id` | Personaggio MealPulse | Descrizione |
|---|---|---|---|
| `napoletano.wav` | `napoletano` (o `zio_italiano`) | 🤌 **Zio Napoletano** | Voce teatrale, passionale, verace napoletana |
| `chef_gordon.wav` | `chef_gordon` (o `chef_sarcastico`) | 👨‍🍳 **Chef Gordon** | Voce autoritaria, tagliente, severa |
| `diva.wav` | `diva` (o `diva_ironica`) | 💅 **Diva Snob** | Voce chic milanese, ironica e snob |
| `roastmaster.wav` | `roastmaster` | ⚡ **Stand-up Comico** | Voce comico cabaret / romano |
| `sara.wav` | `sara` (o `if_sara`) | 🎙️ **Sara Gen-Z** | Voce femminile dinamica |

---

## 🎧 Linee Guida per i File Audio di Riferimento

Per ottenere il miglior risultato possibile di clonazione vocale con XTTS-v2:
1. **Durata ottimale**: tra **6 e 15 secondi** di parlato continuo.
2. **Qualità del suono**: audio pulito, senza rumore di fondo, senza eco o riverbero, **senza musica**.
3. **Formato**: file `.wav` (PCM 16-bit o 24-bit), mono o stereo (il modello converte automaticamente a mono 22050/24000Hz).
4. **Espressività**: la voce clonata erediterà il tono, la cadenza, l'accento e l'emozione del campione registrato.

---

## ⚡ Come Funziona il Pre-Caching
All'avvio del server, XTTS-v2 elabora ciascun file `.wav` presente in questa cartella una sola volta, calcolando i tensori `gpt_cond_latent` e `speaker_embedding` e salvandoli in memoria RAM.
Durante le richieste dell'app mobile, la sintesi vocale utilizzerà direttamente i tensori in RAM, azzerando i tempi di rilettura dei file audio!

## Verifica delle voci sul telefono

L'app installata legge l'indirizzo TTS da `app_config.tts_api_url` su Supabase.
Se cambia l'IP del Mac, aggiornare quel valore: modificare solo `.env` non aggiorna
il bundle già installato. Con un indirizzo LAN, telefono e Mac devono essere sulla
stessa rete. Chiudere completamente e riaprire l'app per aggiornare l'indirizzo e
svuotare la cache audio in memoria. Se una richiesta fallisce, l'app può ripiegare
sulla sintesi vocale del telefono, che non usa questi campioni.

Il server riconosce sia gli ID storici dell'app sia i nomi normalizzati. Le voci
XTTS con accenti (`Camilla Holmström`, `Alma María`, `Eugenio Mataracı`) accettano
anche gli ID ASCII del client. Un ID sconosciuto restituisce HTTP 422 anziché
sostituire silenziosamente il personaggio. L'assenza di un ID usa la voce predefinita.

Le risposte WAV includono `X-Voice-Id`, `X-Voice-Source`, `X-Voice-Reference` e
`X-Voice-Reference-SHA256` per verificare il campione selezionato. Dopo aver
cambiato un campione, usare `POST /api/voices/reload` o riavviare il server;
il reload svuota anche la cache degli audio generati.

Per generare una prova reale con tutti i 63 ID presenti nel selettore:

```bash
tts_env/bin/python tools/verify_all_tts_voices.py --url http://IP_DEL_MAC:8000
```

Il test verifica ID risolti, origine delle cinque voci clonate, hash dei campioni,
formato WAV e risposte distinte. Salva WAV e report in
`/tmp/mealpulse-voice-verification`. Questi controlli verificano il collegamento
al campione corretto; la somiglianza percepita richiede anche un confronto all'ascolto.

## Prestazioni del server

La cache WAV usa RAM e disco (`.tmp/tts-audio-cache`, configurabile tramite
`TTS_AUDIO_CACHE_DIR`). La cache disco conserva al massimo 300 file / 256 MiB,
con scadenza dopo sette giorni senza accessi. Le chiavi comprendono voce,
hash del campione, testo completo, lingua, velocità e temperatura.
`AUDIO_CACHE_VERSION` in `main.py` va incrementato se si cambiano i pesi del modello.
Il reload delle voci svuota entrambe le cache.

Per preparare le anteprime esatte del selettore già presente nell'app:

```bash
tts_env/bin/python tools/warm_tts_previews.py
```

Su MPS il default è un thread CPU, misurato più veloce su questo Mac;
`OMP_NUM_THREADS` consente un override. Il benchmark riproducibile è
`tools/benchmark_tts_threads.py`. La sintesi rimane serializzata perché XTTS
condivide lo stato interno, ma richieste alla cache e health check possono
rispondere mentre viene generato un altro audio.
