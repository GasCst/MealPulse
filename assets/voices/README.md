# 🎙️ MealPulse AI — Cartella Voci di Riferimento per XTTS-v2

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
