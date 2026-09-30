# TTS locale: voci clonate e napoletano

Il launcher macOS usa **Qwen3-TTS 1.7B Base, 4 bit, con MLX/Metal** per i cinque
personaggi. Mantiene XTTS-v2 in un processo separato per le 58 voci predefinite.
Gli ID, gli alias e le due API del telefono restano compatibili. Ogni risposta è
un WAV mono, PCM16, 24 kHz. Non occorre un nuovo AAB per cambiare il motore sul Mac.

## Installazione e avvio

Su Apple Silicon, con Python 3.11:

```sh
python3.11 -m venv venv_mlx_tts
venv_mlx_tts/bin/python -m pip install -r requirements-mlx.in
./start_native_tts.sh
```

L'ambiente originale `tts_env` deve rimanere disponibile per le voci XTTS.
Modello e riferimenti si caricano prima di accettare richieste; per impostazione
predefinita si carica anche XTTS, evitando che la prima voce standard superi il
timeout del telefono. L'avvio è più lungo di una normale generazione.

Il primo avvio scarica il modello. Le successive sintesi usano la copia locale.
La revisione del modello è fissata in `mlx_tts_engine.py`; la cache comprende
modello, revisione, riferimento, trascrizione, testo intero, lingua e parametri.
Modello e riferimento vengono mantenuti in memoria. Le risposte ripetute usano
la cache RAM/disco già presente, limitata a 300 file / 256 MiB / sette giorni.

## Dialetto: testo e voce sono due parti distinte

La clonazione conserva il timbro e parte dell'accento; non traduce il testo.
Per Zio Napoletano, i prompt del coach e del roast ora chiedono napoletano
colloquiale quando la lingua impostata è l'italiano. I fallback di briefing,
idratazione, resoconto e record includono frasi dialettali. Le altre lingue
mantengono la lingua selezionata. Queste modifiche del client richiedono che la
nuova versione del codice arrivi sul dispositivo; non sono presenti nel vecchio AAB.

Per l'app già installata, `TTS_DIALECT_REWRITE=1` abilita la riscrittura sul server:
solo Zio, solo lingua italiana, e solo se il testo non contiene già indicatori
dialettali. Usa Gemini (lo stesso servizio già usato dall'app), con un timeout
breve. Non viene eseguito un modello linguistico aggiuntivo sul Mac. La sintesi
vocale rimane locale; la riscrittura del testo richiede internet e usa la quota
Gemini del progetto. La voce napoletana non è una lingua nativamente certificata
dal modello: pronuncia e naturalezza vanno controllate all'ascolto.

Per la chiave, `GEMINI_API_KEY` sul server ha priorità; in assenza viene letta la
chiave Gemini già presente nel `.env` del progetto. Nessuna chiave viene restituita
nelle API o nei log. Numeri cambiati/aggiunti/omessi fanno scartare la riscrittura.
Se Gemini non risponde, viene letto il testo originale con la voce clonata e
`X-Dialect-Status: unavailable`; questa risposta non viene memorizzata come una
riscrittura riuscita. `TTS_DIALECT_REWRITE=0` disabilita tutte le richieste Gemini
del server; testi napoletani già pronti funzionano anche così.

I numeri vengono convertiti in parole soltanto per la pronuncia (es. `140g` →
`centoquaranta grammi`). Il testo ricevuto e i dati nutrizionali dell'app restano
intatti. La sintesi elimina puntini di sospensione eccessivi, mantenendo gli
apostrofi napoletani. Non altera la velocità o l'intonazione per simulare personaggi.

## Riferimenti vocali

I WAV originali in `assets/voices/` non vengono modificati. `references.json`
descrive il ritaglio, il testo pronunciato e l'hash di ogni sorgente. Le
trascrizioni iniziali sono automatiche: controllarle, soprattutto per il dialetto.
Se cambi un WAV, ricrea il manifesto, controlla la trascrizione e ricarica:

```sh
venv_mlx_tts/bin/python tools/prepare_mlx_references.py
curl -X POST http://localhost:8000/api/voices/reload
```

Un riferimento con un solo parlante, pulito e senza musica, di circa 8–15 secondi,
aiuta a ottenere una voce stabile. Dialoghi, effetti, sovrapposizioni o doppiaggi
possono influire sull'identità e sul tono. L'ASR si esegue soltanto quando prepari
i riferimenti, mai durante una richiesta del telefono. Un WAV cambiato senza
aggiornare il manifesto viene rifiutato, evitando trascrizioni non corrispondenti.

## Controlli

```sh
curl http://localhost:8000/health
venv_mlx_tts/bin/python -m unittest discover -s tools -p 'test_tts*.py'
venv_mlx_tts/bin/python tools/verify_all_tts_voices.py --url http://localhost:8000
```

`/health` riporta modello, motore, riferimenti caricati e riscrittura dialettale.
Le risposte nuove includono `X-Voice-Id`, `X-Voice-Reference-SHA256`, `X-Engine`,
`X-Generation-Time`, `X-Queue-Time`, `X-Audio-Cached` e `X-Dialect-Status`.
Il tempo di generazione comprende l'eventuale riscrittura, ma separa l'attesa
in coda. Gli audio ripetuti saltano sia riscrittura sia inferenza.

## Indirizzo del Mac e voce di sistema sul telefono

Il telefono legge `app_config`, chiave `tts_api_url`, da Supabase. Se il Mac cambia
IP, aggiornare quella riga con un account amministratore; modificare soltanto
`.env` non cambia il valore remoto. La configurazione permette letture pubbliche,
ma RLS impedisce scritture dal client. Non è configurato un publisher automatico
dell'IP del Mac. Non rendere la tabella scrivibile da tutti per aggirare questo limite.

Il client aggiornato interroga Supabase prima di ogni richiesta TTS e condivide
le letture simultanee. Usa la cache soltanto se la lettura remota fallisce, con
timeout di 2,5 secondi e annullamento della richiesta. Il vecchio client può
conservare l'IP in memoria: chiudere completamente e riaprire MealPulse, attendere
qualche secondo, quindi provare un messaggio nuovo. La correzione della riga in
Supabase è immediata e non richiede un nuovo AAB; il nuovo codice client sì.

Per controllare l'indirizzo e una vera risposta della voce selezionata:

```sh
venv_mlx_tts/bin/python tools/test_remote_config.py
venv_mlx_tts/bin/python tools/test_remote_config.py --voice if_sara
node --test tools/test_remote_config.cjs
```

La nuova versione
del client include lingua e testo intero nelle chiavi di cache, così messaggi
con la stessa apertura e numeri diversi non condividono erroneamente un audio.
L'audio già memorizzato nel vecchio client si elimina chiudendo completamente
e riaprendo l'app. Il telefono continua ad attendere l'intero WAV: non è streaming.

Il Mac deve rimanere acceso, sveglio e raggiungibile. Questo cambiamento non rende
il servizio disponibile quando il Mac dorme o è spento. Il fallback del telefono
usa una voce di sistema e non può conservare la clonazione o garantire l'accento.

## Confronti e configurazione

Sul MacBook Air M3 / 24 GB, le prove iniziali hanno misurato circa 3,4 s per una
frase breve e 4–6,2 s per briefing di circa 15–20 parole, con un singolo chiamante.
Un WAV già in cache ha risposto in circa 9 ms in locale. Non sono garanzie:
testo, calore del Mac, processi attivi, rete e richieste simultanee incidono.
La qualità percepita richiede l'ascolto; le verifiche automatiche non la certificano.

È stata confrontata anche la variante 0.6B/8 bit: la 1.7B/4 bit ha mantenuto
tempi simili per la frase breve e offre più capacità per i personaggi. È il
default attuale, da confermare all'ascolto. Per provare il modello più piccolo:

```sh
TTS_MLX_MODEL=mlx-community/Qwen3-TTS-12Hz-0.6B-Base-8bit \
TTS_MLX_REVISION=50f45ef0047cde7e84c2ef04326acb8ada2436a7 ./start_native_tts.sh
```

Per tornare al solo XTTS: `TTS_ENGINE=xtts ./start_native_tts.sh`.
Il vecchio modello e i suoi riferimenti restano disponibili. Non avviare due
server sulla stessa porta. Usa `PORT` per un confronto su una porta differente.

Fonti: [Qwen3-TTS Base](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-Base),
[MLX-Audio](https://github.com/Blaizzy/mlx-audio).
