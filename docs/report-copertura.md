# Report di copertura — NCA-GENL Studio vs blueprint d'esame

*Data: 28 settembre 2026 · Stato del repo: commit `1e8f337` (492 domande, 7 capitoli + ripasso)*

## 1. Metodo

1. **Blueprint ufficiale** dalla pagina NVIDIA della certificazione e dagli obiettivi
   ripresi dalle guide di studio pubbliche (vedi *Fonti*).
2. **Argomenti ricorrenti all'esame** dai resoconti di chi l'ha sostenuto e dai cheat-sheet
   della community.
3. **Misura della copertura**: ricerca per parole chiave (≈110 termini) in
   `content/chapters-*.json` (appunti, slide, script audio) e in `content/questions/*.json`.
   I numeri sotto sono **conteggi di occorrenze negli appunti** e **numero di domande che
   citano il termine**: indicano presenza/assenza, non la qualità della trattazione.

## 2. Il blueprint ufficiale

Esame: 50–60 domande a scelta multipla, 60 minuti, in inglese, online con proctor.

| Dominio ufficiale | Peso | Obiettivi principali |
|---|---|---|
| Core Machine Learning and AI Knowledge | **30%** | Transformer, LLM, RAG/chatbot/summarization, vettorizzazione dei dati per RAG, feature engineering, confronto modelli, cross-validation, embedding, prompt engineering, Python (spaCy, NumPy, Keras, vector DB) |
| Software Development | **24%** | Deployment e valutazione di scalabilità/prestazioni/affidabilità, app RAG e chatbot, scelta di hardware/software, script Python, tool NVIDIA (NeMo, NIM, Triton, TensorRT-LLM) |
| Experimentation | **22%** | Confronto modelli con metriche statistiche e loss, fine-tuning, metriche di valutazione, disegno sperimentale e A/B test |
| Data Analysis and Visualization | **14%** | Data mining, visualizzazioni (grafici), loss function, explained variance, pattern e trend, RAPIDS/cuDF/cuML, preprocessing |
| Trustworthy AI | **10%** | Fondamenti etici, privacy vs consenso dei dati, tecnologie NVIDIA e non per l'affidabilità dell'AI, riduzione del bias |

> Alcuni siti (es. FlashGenius) riportano una suddivisione in 10 domini ("Prompt Engineering 8%",
> "RAG 8%", "Ethical AI 10%"…): **non è quella ufficiale**, ma conferma gli stessi temi.

## 3. Come il sito si mappa sul blueprint

| Dominio | Capitoli del sito | Domande (stima) | Peso d'esame |
|---|---|---|---|
| Core ML & AI | 1 Transformer, 2 LLM, 5 NLP | ~207 (42%) | 30% |
| Software Development | 4 Tool NVIDIA, parte del 7 | ~110 (22%) | 24% |
| Experimentation | 3 Training, 6 Metriche | ~138 (28%) | 22% |
| Data Analysis & Visualization | — **nessun capitolo** | ~5 (1%) | **14%** |
| Trustworthy AI | — **nessun capitolo** | ~20 (4%) | **10%** |

**Circa il 24% dell'esame (Data Analysis + Trustworthy AI) non ha un capitolo dedicato**,
né lezione audio, né riassunto, né quiz.

## 4. Buchi di copertura (in ordine di priorità)

### 🔴 A. Trustworthy AI — 10% dell'esame, assente dagli appunti

| Argomento | Appunti | Domande |
|---|---|---|
| Principi NVIDIA Trustworthy AI (privacy, safety & security, transparency, nondiscrimination, accountability) | 0 | ~4 |
| Privacy vs consenso dei dati, PII, anonimizzazione | solo accenni NER | 4–6 |
| Bias e fairness (misura e mitigazione) | solo "EDA rivela bias" | ~13 |
| NeMo Guardrails (guardrail, content moderation, topical/safety rails) | 0 | 20 |
| Model card / Model Card++ di NVIDIA | 0 | 0 |
| Differential privacy, federated learning (es. NVIDIA FLARE) | 0 | 0 |
| Content provenance: C2PA, watermarking | 0 | 0 |
| Red teaming, prompt injection, jailbreak | 0 | 5 |
| Explainability / interpretabilità | poche | 2 |

### 🔴 B. Data Analysis & Visualization — 14% dell'esame, quasi assente

| Argomento | Appunti | Domande |
|---|---|---|
| RAPIDS, cuDF, cuML (GPU data science) | 0 | 1 |
| pandas / Dask / Polars | 0 | 0–1 |
| Tipi di grafico e quando usarli (istogramma, scatter, box plot, heatmap, curve di loss) | 0 | ~1 |
| Explained variance, PCA, t-SNE/UMAP | 0 | 0 |
| MSE/RMSE, R², loss function per regressione | 0 | 0 |
| Cross-validation, feature engineering | 0 | 0 |
| Data cleaning, deduplica, data augmentation, synthetic data | ~1 | ~7 |
| Confusion matrix, ROC/AUC | pochi | 2 |

### 🟠 C. Ecosistema NVIDIA — gli appunti fermi a NeMo/Triton/TensorRT/DGX

Il capitolo 4 copre bene NeMo, Triton, TensorRT, ONNX e DGX. Tutto il resto esiste **solo nel
banco domande** (quindi senza lezione né riassunto) o non esiste affatto:

| Tool | Appunti | Domande |
|---|---|---|
| NIM (NVIDIA Inference Microservices) | 0 | 20 |
| TensorRT-LLM (in-flight batching, KV cache paginata) | 0 | 13 |
| NeMo Guardrails / NeMo Retriever / NeMo Curator | 0 | 20 / 2 / 10 |
| NGC Catalog | 0 | 8 |
| **NVIDIA AI Enterprise** | 0 | **0** |
| **MIG (Multi-Instance GPU)** | 0 | **0** |
| **Riva** (speech AI), **Megatron-Core**, **Base Command** | 0 | **0** |
| NCCL e training distribuito (data/tensor/pipeline parallel, All-Reduce) | 0 | 1–6 |

### 🟠 D. Prompt engineering e sviluppo di applicazioni LLM

Obiettivi espliciti del blueprint (1.3, 1.4, 1.9, 4.2), trattati **solo nelle domande**:

| Argomento | Appunti | Domande |
|---|---|---|
| Zero-shot / few-shot / chain-of-thought, system prompt | 4 (zero-shot) / — / 0 / 0 | 5 / — / 3 / 6 |
| Parametri di decoding: temperature, top-k | parziale (top-p, beam) | sì |
| Pipeline RAG completa: chunking, embedding model, vector DB (FAISS, Milvus), cosine similarity, reranking, hybrid search/BM25 | RAG solo concettuale; vector DB e cosine 0 | 3–20 |
| LangChain / LlamaIndex, agenti, function calling | 0 | 1–9 |
| **Librerie Python del blueprint: spaCy, NumPy, Keras, Hugging Face Transformers** | **0** | **0** |
| Ottimizzazione inference LLM: KV cache, FlashAttention, speculative decoding | 0 | 11 / 0 / 1 |

### 🟡 E. Fondamenti ML e training moderno

| Argomento | Appunti | Domande |
|---|---|---|
| Backpropagation, funzioni di attivazione (ReLU, GELU, softmax), optimizer (SGD, Adam) | quasi 0 | 2 / 14 / 0 |
| Batch norm vs layer norm, vanishing gradient, loss/cross-entropy | poche | poche |
| Architetture pre-Transformer: RNN/LSTM, CNN; ML classico (SVM, k-means) | poche | 1–15 |
| Allineamento: SFT, instruction tuning, RLHF, DPO | 0 | 3–9 |
| QLoRA, P-tuning | 0 | 2–3 |
| Scaling laws (Chinchilla), context window, RoPE, **Mixture of Experts** | 0 | 2 / 23 / 3 / **0** |
| Mixed precision FP16/BF16/FP8 | sì (10) | 8 |

### 🟡 F. Experimentation — metriche e disegno sperimentale

Il capitolo 6 è solido su BLEU, ROUGE, F1, perplexity, quantization. Mancano:
BERTScore e METEOR (1 domanda ciascuno), LLM-as-a-judge (0 negli appunti), benchmark standard
(MMLU, GLUE/SuperGLUE, HellaSwag: 1 domanda), significatività statistica negli A/B test,
hyperparameter tuning ed experiment tracking.

### ⚪ G. Minori

Modelli multimodali (CLIP, vision-language): 0 negli appunti. GAN/VAE come confronto con i
diffusion model: 0 negli appunti, 3 domande.

## 5. Punti di forza (nessun intervento necessario)

Transformer e attention, BERT/GPT/T5, PEFT/LoRA/adapter, BLEU/ROUGE/F1/perplexity,
quantization/distillation/pruning, Triton vs TensorRT, NER/classificazione/QA, tokenizzazione
subword (BPE, WordPiece), A/B test di base.

## 6. Raccomandazioni

1. **Nuovo capitolo 8 — Trustworthy AI** (10%): principi NVIDIA, bias e fairness, privacy e
   consenso, PII, NeMo Guardrails, model card, differential privacy e federated learning,
   C2PA/watermark, red teaming e prompt injection. + 50–60 domande.
2. **Nuovo capitolo 9 — Data Analysis & RAPIDS** (14%): EDA, scelta del grafico, pandas vs
   cuDF/cuML/Dask, metriche di regressione (MSE, R², explained variance), PCA/t-SNE,
   cross-validation, feature engineering, confusion matrix e ROC. + 50–60 domande.
3. **Ampliare il cap. 4**: NIM, TensorRT-LLM, NeMo Guardrails/Retriever/Curator, NGC,
   AI Enterprise, MIG, Riva, training distribuito con NCCL/Megatron.
4. **Ampliare il cap. 7** (o nuovo capitolo "Prompt engineering & LLM app"): tecniche di
   prompting, parametri di decoding, pipeline RAG completa con vector DB, LangChain/LlamaIndex,
   agenti, librerie Python del blueprint (spaCy, NumPy, Keras, Hugging Face).
5. **Ampliare i cap. 1 e 3**: fondamenti di reti neurali, allineamento (SFT, RLHF, DPO),
   QLoRA, scaling laws, MoE, RoPE, KV cache.
6. **Riequilibrare il banco domande** verso i pesi ufficiali (oggi Core ML è al 42% contro il
   30% d'esame) e aggiornare la scheda *quick-ref* con le trappole dei nuovi argomenti.

## Fonti

- [NVIDIA — Generative AI LLMs Associate (pagina ufficiale)](https://www.nvidia.com/en-us/learn/certification/generative-ai-llm-associate/)
- [Ravikiran S — NCA-GENL Study Guide (obiettivi per dominio)](https://ravikirans.com/nca-genl-study-guide/)
- [Preporato — NCA-GENL Complete Guide 2026](https://preporato.com/certifications/nvidia/generative-ai-llm-associate/articles/nvidia-nca-genl-certification-complete-guide-2025)
- [WellWells — NCA-GENL 20-Minute Passing Guide](https://wellstsai.com/en/post/nvidia-nca-genl-exam-study-guide/)
- [DolbyUUU — Cheat Sheet NCA-GENL (GitHub)](https://github.com/DolbyUUU/Cheat-Sheet-for-NVIDIA-Certified-Associate-Generative-AI-LLMs-NCA-GENL-)
- [FlashGenius — NCA-GenL Certification Guide 2026](https://flashgenius.net/certification/nca-genl) (suddivisione non ufficiale)
