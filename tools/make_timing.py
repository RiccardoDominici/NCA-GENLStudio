#!/usr/bin/env python3
"""Genera content/timing.json: mappa tempo -> frase -> slide per il player.

Sincronizza slide e trascrizione karaoke con l'audio TTS di ogni capitolo.

Uso:
    python3 tools/make_timing.py                  # rigenera tutti i capitoli con audio pronto
    python3 tools/make_timing.py --chapter ch7-applications   # rigenera/aggiunge un solo capitolo

Contratto di output (consumato dal player, rispettarlo esattamente):
    {"version": 1, "gap_sec": 0.25,
     "chapters": {"<id>": {"audio": "audio/<id>.mp3",
                            "duration": 286.45,
                            "sentences": [{"t0": 0.0, "t1": 3.2,
                                           "slide": 0, "text": "..."}]}}}

Regole di temporizzazione (identiche alla sintesi TTS):
  - splitter frasi: re.split(r"(?<=[.!?…])\\s+", ...) + ri-split a >300ch su [,;:]
  - pausa tra frasi nel wav: GAP_SEC = 0.25s
  - speech = durata_reale - (n-1) * GAP_SEC, ripartita sulle frasi in
    proporzione ai caratteri; tempi arrotondati a 2 decimali, prima frase
    t0 = 0.0, ultima frase t1 == duration.

Mappatura frasi -> slide: definita a mano in SLIDE_BREAKS come lista di
coppie (indice_prima_frase, indice_slide); gli indici slide sono monotoni
non-decrescenti lungo le frasi. Se lo script di un capitolo cambia (e quindi
il numero di frasi), lo script fallisce con un errore esplicito: aggiornare
la mappa di quel capitolo.

Compromessi noti (script e slide non sempre nello stesso ordine):
  - ch1: lo script anticipa il positional encoding prima della self-attention,
    mentre il deck lo mette dopo (slide 3). Per monotonia le frasi 8-13
    restano sulla slide 0 (overview del parallelismo); la slide 3 non viene
    mostrata, ma il concetto e' narrato e ricapitolato sulla slide 5.
  - ch4: lo script tratta TensorRT prima di Triton, il deck li ordina
    al contrario (Triton slide 1, TensorRT slide 2). Il blocco TensorRT
    (frasi 10-18) resta sulla slide 1, il blocco Triton (19-28) la segue
    sulla stessa slide; le frasi 29-30 (distinzione Triton-serve/TensorRT-
    ottimizza) agganciano la slide 2 cosi' tutte le slide appaiono.

Solo stdlib + ffprobe. Capitoli senza audio (es. ch7 prima del TTS)
vengono saltati con un warning nel run completo.
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

# Directory radice del sito (tools/ si trova subito sotto).
ROOT = Path(__file__).resolve().parent.parent
CONTENT_DIR = ROOT / "content"
AUDIO_DIR = ROOT / "audio"
OUT_PATH = CONTENT_DIR / "timing.json"

GAP_SEC = 0.25
VERSION = 1

# Capitolo -> [(indice_prima_frase, indice_slide), ...].
# L'ultima coppia copre tutte le frasi fino alla fine del capitolo.
SLIDE_BREAKS = {
    # ch1: 0-13 intro+RNN+parallelo+positional, 14-26 QKV, 27-33 multi-head,
    #      34-38 componenti layer, 39-46 recap (slide 3 mai mostrata, v. sopra).
    "ch1-transformer": [(0, 0), (14, 1), (27, 2), (34, 4), (39, 5)],
    # ch2: 0-3 intro, 4-12 BERT, 13-21 GPT+few-shot, 22-30 T5,
    #      31-41 pre/fine-tuning/transfer, 42-52 concetti chiave + recap.
    "ch2-llm": [(0, 0), (4, 1), (13, 2), (22, 3), (31, 4), (42, 5)],
    # ch3: 0-8 intro+full FT, 9-17 PEFT/LoRA, 18-20 EDA, 21-25 forgetting,
    #      26-28 trucchi ottimizzazione, 29-40 A/B testing + recap.
    "ch3-training": [(0, 0), (9, 1), (18, 2), (21, 3), (26, 4), (29, 5)],
    # ch4: 0-9 intro+NeMo, 10-18 TensorRT (su slide 1), 19-28 Triton,
    #      29-30 distinzione serve/ottimizza, 31-35 DGX+ONNX, 36-45 mappa+chiusura.
    "ch4-nvidia-tools": [(0, 0), (10, 1), (29, 2), (31, 3), (36, 4)],
    # ch5: 0-7 intro+NER, 8-11 classificazione, 12-17 QA, 18-21 fondamenta,
    #      22-30 mappa esame + approfondimenti.
    "ch5-nlp": [(0, 0), (8, 1), (12, 2), (18, 3), (22, 4)],
    # ch6: 0-9 intro+BLEU, 10-13 ROUGE, 14-19 quantization, 20 distillation,
    #      21-35 A/B testing + dettagli + chiusura.
    "ch6-metrics": [(0, 0), (10, 1), (14, 2), (20, 3), (21, 4)],
    # quick-ref: 0-1 formato/tempo, 2-9 frasi di emergenza, 10-19 associazioni,
    #      20 concetti tecnici, 21-25 strategia + chiusura.
    "quick-ref": [(0, 0), (2, 1), (10, 2), (20, 3), (21, 4)],
    # ch7: 0-14 RAG (intro, 4 fasi, benefici), 15-19 domini, 20-22 beam/top-p,
    # 23 diffusion (la frase 27 sul few-shot resta sulla slide 4 per monotonia:
    # il few-shot e' citato li' come prototipazione economica in produzione),
    # 24-37 deployment, recap ancore, blocco trasversale e chiusura.
    "ch7-applications": [(0, 0), (15, 1), (20, 2), (23, 3), (24, 4)],
}


def split_sentences(text):
    """Splitter IDENTICO a quello della sintesi TTS: non modificarlo."""
    parts = re.split(r"(?<=[.!?…])\s+", text.strip())
    out = []
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if len(p) > 300:
            for q in re.split(r"(?<=[,;:])\s+", p):
                q = q.strip()
                if q:
                    out.append(q)
        else:
            out.append(p)
    return out


def expand_breaks(breaks, n_sentences, n_slides, chapter_id):
    """Espande le coppie (prima_frase, slide) in una slide per frase."""
    slides = []
    for i, (start, slide) in enumerate(breaks):
        end = breaks[i + 1][0] if i + 1 < len(breaks) else n_sentences
        slides.extend([slide] * (end - start))
    if len(slides) != n_sentences:
        raise ValueError(
            f"[{chapter_id}] mappa slide copre {len(slides)} frasi ma lo "
            f"script ne produce {n_sentences}: aggiornare SLIDE_BREAKS."
        )
    for i in range(1, len(slides)):
        if slides[i] < slides[i - 1]:
            raise ValueError(
                f"[{chapter_id}] slide non monotone alle frasi {i - 1} -> {i}: "
                "aggiornare SLIDE_BREAKS."
            )
    for s in slides:
        if s >= n_slides:
            raise ValueError(
                f"[{chapter_id}] slide {s} fuori range (il deck ne ha {n_slides})."
            )
    return slides


def probe_duration(mp3_path):
    """Durata reale dell'mp3 via ffprobe, in secondi (float)."""
    proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(mp3_path)],
        capture_output=True, text=True, check=True,
    )
    return float(proc.stdout.strip())


def build_chapter(chapter):
    """Costruisce il blocco timing di un capitolo. Ritorna None se manca l'audio."""
    cid = chapter["id"]
    mp3 = AUDIO_DIR / f"{cid}.mp3"
    if not mp3.exists():
        print(f"WARN: audio mancante, salto capitolo: {mp3}", file=sys.stderr)
        return None
    sentences = split_sentences(chapter["script"])
    n = len(sentences)
    if cid not in SLIDE_BREAKS:
        raise ValueError(f"[{cid}] nessuna mappa in SLIDE_BREAKS: aggiungerla.")
    slides = expand_breaks(SLIDE_BREAKS[cid], n, len(chapter["slides"]), cid)

    duration = probe_duration(mp3)
    speech = duration - (n - 1) * GAP_SEC
    if speech <= 0:
        raise ValueError(f"[{cid}] durata {duration}s insufficiente per {n} frasi.")
    weights = [len(s) for s in sentences]
    total = sum(weights)

    # Cumulo esatto, arrotondamento solo in output: inizio_frase[i] =
    # fine_parlato[i-1] + GAP_SEC; prima t0 = 0.0, ultima t1 == duration.
    speech_end = [0.0]  # fine cumulata della parte parlata (tempi esatti)
    acc = 0.0
    for w in weights:
        acc += speech * w / total
        speech_end.append(acc)
    out_sentences = []
    for i, s in enumerate(sentences):
        t0 = 0.0 if i == 0 else speech_end[i] + i * GAP_SEC
        t1 = speech_end[i + 1] + i * GAP_SEC
        out_sentences.append({
            "t0": 0.0 if i == 0 else round(t0, 2),
            "t1": round(t1, 2),
            "slide": slides[i],
            "text": s,
        })
    out_sentences[-1]["t1"] = round(duration, 2)

    print(f"OK {cid}: {n} frasi, duration={round(duration, 2)}s, "
          f"speech={round(speech, 2)}s")
    return {
        "audio": f"audio/{cid}.mp3",
        "duration": round(duration, 2),
        "sentences": out_sentences,
    }


def load_chapters():
    """Tutti i capitoli da content/chapters-*.json, in ordine di file."""
    chapters = []
    for path in sorted(CONTENT_DIR.glob("chapters-*.json")):
        chapters.extend(json.loads(path.read_text(encoding="utf-8")))
    return chapters


def main():
    parser = argparse.ArgumentParser(description="Rigenera content/timing.json.")
    parser.add_argument("--chapter", default=None,
                        help="rigenera/aggiunge un solo capitolo (es. ch7-applications)")
    args = parser.parse_args()

    chapters = load_chapters()
    if args.chapter:
        chapters = [c for c in chapters if c["id"] == args.chapter]
        if not chapters:
            print(f"ERRORE: capitolo '{args.chapter}' non trovato nei chapters-*.json.",
                  file=sys.stderr)
            return 2
        try:
            data = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        except FileNotFoundError:
            data = {"version": VERSION, "gap_sec": GAP_SEC, "chapters": {}}
    else:
        data = {"version": VERSION, "gap_sec": GAP_SEC, "chapters": {}}

    data["version"] = VERSION
    data["gap_sec"] = GAP_SEC

    failed = False
    for chapter in chapters:
        try:
            block = build_chapter(chapter)
        except (ValueError, subprocess.CalledProcessError) as exc:
            print(f"ERRORE [{chapter['id']}]: {exc}", file=sys.stderr)
            failed = True
            continue
        if block is None:
            if args.chapter:
                # Richiesta esplicita ma audio assente: fallimento rumoroso.
                print(f"ERRORE: audio mancante per '{chapter['id']}', "
                      f"niente da generare.", file=sys.stderr)
                failed = True
            continue
        data["chapters"][chapter["id"]] = block

    if failed:
        return 1
    OUT_PATH.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n",
                        encoding="utf-8")
    print(f"Scritto {OUT_PATH} ({len(data['chapters'])} capitoli).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
