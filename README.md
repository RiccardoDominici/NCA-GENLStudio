# NCA-GENL Studio

Sito di studio interattivo per l'esame **NVIDIA Certified Associate: Generative AI and LLMs (NCA-GENL)** — appunti in italiano, audio-lezioni con sintesi vocale locale, slide sincronizzate, quiz e tracciamento dei progressi.

🌐 **Sito live:** https://nvidia-nca-studio.pages.dev/

Appunti e sito web a cura di Riccardo Dominici.

## Contenuti

7 capitoli + 1 scheda di ripasso last-minute, organizzati in 3 macro-aree:

| Area | Capitoli |
|------|----------|
| Fondamenti | 1. Architettura Transformer · 2. LLM |
| Pratica MLOps | 3. Training · 4. Tool NVIDIA · 6. Metriche |
| Applicazioni | 5. NLP applicata · 7. Casi GenAI |
| Ripasso | Scheda rapida pre-esame (formule, trappole, checklist) |

Ogni capitolo ha 4 schede: **Lezione guidata** (audio + slide + trascrizione karaoke), **Riassunto**, **Parole chiave**, **Quiz**.

## Caratteristiche

- **Mappa SVG** dei capitoli con stato di avanzamento (da fare / in corso / completato)
- **Audio-lezioni TTS** in italiano (voce Marta, sintesi locale — nessun servizio esterno)
- **Slide sincronizzate** con l'audio: navigare le slide sposta il punto di ascolto
- **Player custom**: play/pausa, ±10s, barra con marcatori slide, velocità di riproduzione
- **Trascrizione karaoke**: highlight in tempo reale, auto-scroll, click sulla frase = seek
- **Formule** composte in MathML nativo (offline, zero CDN), con fallback Unicode
- **Quiz** di fine capitolo + **tracker** dei progressi in `localStorage`
- 100% statico, zero build, zero dipendenze: funziona su qualsiasi hosting statico

## Uso locale

Serve un server HTTP (il `fetch` dei JSON non funziona da `file://`):

```bash
cd nvidia-nca-studio
python3 -m http.server 8000
# apri http://localhost:8000
```

## Struttura

```
├── index.html            # home: mappa SVG + progressi
├── chapter.html          # pagina capitolo (4 schede)
├── app.js                # loader contenuti (unisce chapters-1/2.json)
├── map.js                # mappa SVG interattiva
├── chapter.js            # lezione: player, slide, karaoke, formule MathML
├── quiz.js               # quiz di fine capitolo
├── tracker.js            # progressi in localStorage (chiave: nca-progress)
├── style.css             # tema carta-penna leggibile
├── content/
│   ├── chapters-1.json   # capitoli 1–3 (testi, slide, script, quiz)
│   ├── chapters-2.json   # capitoli 4–7 + quick-ref
│   ├── timing.json       # mappa tempo→frase→slide per il player (generato)
│   └── README            # contratto dello schema JSON dei capitoli
├── audio/
│   └── *.mp3             # audio-lezioni (gli unici file serviti dal player)
└── tools/
    └── make_timing.py    # rigenera content/timing.json dagli mp3 reali
```

## Rigenerare i timing

`content/timing.json` mappa ogni frase allo slide e al tempo nell'audio. Se cambi uno script o un mp3, rigeneralo:

```bash
python3 tools/make_timing.py                        # tutti i capitoli
python3 tools/make_timing.py --chapter ch3-training  # un solo capitolo
```

Regole (identiche alla sintesi TTS): splitter frasi su `[.!?…]`, pausa di 0,25s tra frasi,
durata ripartita in proporzione ai caratteri. Dettagli nel docstring di `tools/make_timing.py`.

> Nota: i file `.wav` intermedi della sintesi vocale **non** sono nel repo (vedi `.gitignore`):
> il player usa solo gli `.mp3` e `make_timing.py` legge gli `.mp3`.

## Deploy

Deploy attuale su **Cloudflare Pages** (solo file necessari, `.wav` esclusi):

```bash
npx wrangler pages project create nvidia-nca-studio
npx wrangler pages deploy . --branch main
```

## Sorgente dei contenuti

Basato sulla guida di studio open-source https://github.com/ednarvaez/nvidia-certified-associate-study-guide
(riscritta e ampliata: script audio, slide, quiz e parole chiave sono originali).
