/* qbank.js — banco domande: caricamento, validazione, filtri e stato utente.
 *
 * Responsabilità (solo modello/dati, nessun DOM):
 *  - carica content/questions/<chapterId>.json (uno per capitolo, come app.js
 *    fa con i due chapters-*.json): se un file manca il capitolo risulta
 *    semplicemente senza domande, senza rompere la pagina;
 *  - valida e normalizza ogni domanda scartando le voci malformate;
 *  - filtra per capitolo / difficoltà / stato / testo libero;
 *  - persiste le risposte date in localStorage (chiave nca-domande), separata
 *    da nca-progress di tracker.js per non interferire con i progressi corso.
 *
 * Espone NCA.qbank. Il rendering sta in qbank-ui.js. */

(function () {
  'use strict';

  var STORAGE_KEY = 'nca-domande';
  var DIFFICULTIES = ['facile', 'media', 'difficile'];

  /* ---------- Caricamento ---------- */

  /** Percorso del file domande di un capitolo. */
  function fileFor(chapterId) {
    return 'content/questions/' + chapterId + '.json';
  }

  /** Vero se la domanda ha la forma minima attesa dal contratto. */
  function isValidQuestion(o) {
    return o
      && typeof o.q === 'string' && o.q.trim().length > 0
      && Array.isArray(o.options) && o.options.length === 4
      && o.options.every(function (x) { return typeof x === 'string' && x.length > 0; })
      && typeof o.answer === 'number' && o.answer >= 0 && o.answer <= 3;
  }

  /** Riempie i campi opzionali con default sensati e forza i tipi. */
  function normalize(o, chapterId, index) {
    var diff = String(o.difficulty || 'media').toLowerCase();
    return {
      id: typeof o.id === 'string' && o.id ? o.id : chapterId + '-q' + (index + 1),
      chapter: chapterId,
      q: String(o.q).trim(),
      options: o.options.map(function (x) { return String(x); }),
      answer: o.answer | 0,
      explain: String(o.explain || ''),
      difficulty: DIFFICULTIES.indexOf(diff) !== -1 ? diff : 'media',
      tags: Array.isArray(o.tags) ? o.tags.map(function (t) { return String(t).toLowerCase(); }) : [],
      source: String(o.source || '')
    };
  }

  /**
   * Carica le domande di tutti i capitoli in parallelo.
   * @param {string[]} chapterIds ordine dei capitoli (da NCA.app.CHAPTERS)
   * @returns {Promise<{questions:Array, byChapter:Object, missing:string[]}>}
   */
  function load(chapterIds) {
    return Promise.all(chapterIds.map(function (id) {
      return fetch(fileFor(id))
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (json) { return { id: id, data: json }; })
        .catch(function (err) {
          console.warn('[qbank] ' + fileFor(id) + ' non caricato:', err.message);
          return { id: id, data: null };
        });
    })).then(function (results) {
      var questions = [];
      var byChapter = {};
      var missing = [];
      var seen = {};

      results.forEach(function (r) {
        byChapter[r.id] = [];
        if (!Array.isArray(r.data)) { missing.push(r.id); return; }

        r.data.forEach(function (raw, i) {
          if (!isValidQuestion(raw)) {
            console.warn('[qbank] domanda non valida scartata in ' + r.id + ' #' + i, raw);
            return;
          }
          var q = normalize(raw, r.id, i);
          if (seen[q.id]) {            // id duplicato: lo rendo univoco, non lo perdo
            console.warn('[qbank] id duplicato ' + q.id + ', rinominato');
            q.id = q.id + '-' + i;
          }
          seen[q.id] = true;
          questions.push(q);
          byChapter[r.id].push(q);
        });
      });

      console.info('[qbank] caricate ' + questions.length + ' domande su ' +
        chapterIds.length + ' capitoli' + (missing.length ? ' (mancanti: ' + missing.join(', ') + ')' : ''));
      return { questions: questions, byChapter: byChapter, missing: missing };
    });
  }

  /* ---------- Stato utente (localStorage) ---------- */

  /* Shape: { <questionId>: { given: 0..3, ok: bool, starred: bool } } */
  function readAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      var data = JSON.parse(raw);
      return data && typeof data === 'object' ? data : {};
    } catch (err) {
      console.warn('[qbank] localStorage illeggibile, stato vuoto:', err);
      return {};
    }
  }

  function writeAll(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('[qbank] salvataggio stato domande fallito:', err);
    }
  }

  function entryOf(data, qid) {
    return data[qid] || { given: null, ok: null, starred: false };
  }

  var state = {
    key: STORAGE_KEY,

    /** Stato di una singola domanda. */
    get: function (qid) {
      return entryOf(readAll(), qid);
    },

    /** Registra la risposta data; ritorna la voce aggiornata. */
    record: function (qid, given, ok) {
      var data = readAll();
      data[qid] = Object.assign(entryOf(data, qid), { given: given, ok: !!ok });
      writeAll(data);
      return data[qid];
    },

    /** Segna/desegna una domanda da rivedere. Ritorna il nuovo valore. */
    toggleStar: function (qid) {
      var data = readAll();
      var e = entryOf(data, qid);
      e.starred = !e.starred;
      data[qid] = e;
      writeAll(data);
      return e.starred;
    },

    /** Dimentica la risposta a una domanda (la stellina resta). */
    clearAnswer: function (qid) {
      var data = readAll();
      var e = entryOf(data, qid);
      e.given = null;
      e.ok = null;
      data[qid] = e;
      writeAll(data);
    },

    /** Azzera tutte le risposte; le stelline restano se keepStars. */
    resetAnswers: function (keepStars) {
      var data = readAll();
      var next = {};
      if (keepStars) {
        Object.keys(data).forEach(function (qid) {
          if (data[qid] && data[qid].starred) next[qid] = { given: null, ok: null, starred: true };
        });
      }
      writeAll(next);
      console.info('[qbank] risposte azzerate' + (keepStars ? ' (stelline conservate)' : ''));
    },

    /** Statistiche su un insieme di domande: {total, answered, correct, wrong, starred, pct}. */
    stats: function (questions) {
      var data = readAll();
      var answered = 0, correct = 0, starred = 0;
      questions.forEach(function (q) {
        var e = entryOf(data, q.id);
        if (e.starred) starred++;
        if (e.given === null || e.given === undefined) return;
        answered++;
        if (e.ok) correct++;
      });
      return {
        total: questions.length,
        answered: answered,
        correct: correct,
        wrong: answered - correct,
        starred: starred,
        pct: answered ? Math.round((correct / answered) * 100) : 0
      };
    },

    /** Legge tutto lo stato in un colpo solo (per il rendering di liste lunghe). */
    snapshot: readAll
  };

  /* ---------- Filtri ---------- */

  /**
   * Filtra le domande.
   * @param {Array} questions
   * @param {{chapter:string, difficulty:string, status:string, text:string}} f
   *        chapter: id capitolo o 'all'
   *        difficulty: 'facile'|'media'|'difficile'|'all'
   *        status: 'all'|'todo'|'wrong'|'correct'|'starred'
   *        text: ricerca libera su domanda, opzioni e tag
   */
  function filter(questions, f) {
    var data = readAll();
    var needle = String(f.text || '').trim().toLowerCase();

    return questions.filter(function (q) {
      if (f.chapter && f.chapter !== 'all' && q.chapter !== f.chapter) return false;
      if (f.difficulty && f.difficulty !== 'all' && q.difficulty !== f.difficulty) return false;

      if (f.status && f.status !== 'all') {
        var e = entryOf(data, q.id);
        var answered = e.given !== null && e.given !== undefined;
        if (f.status === 'todo' && answered) return false;
        if (f.status === 'wrong' && !(answered && !e.ok)) return false;
        if (f.status === 'correct' && !(answered && e.ok)) return false;
        if (f.status === 'starred' && !e.starred) return false;
      }

      if (needle) {
        var hay = (q.q + ' ' + q.options.join(' ') + ' ' + q.tags.join(' ') + ' ' + q.explain).toLowerCase();
        if (hay.indexOf(needle) === -1) return false;
      }
      return true;
    });
  }

  /* ---------- Utilità ---------- */

  /** Fisher-Yates su una copia dell'array. */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /** n elementi casuali (o tutti se ce ne sono meno). */
  function sample(arr, n) {
    return shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
  }

  window.NCA = window.NCA || {};
  window.NCA.qbank = {
    DIFFICULTIES: DIFFICULTIES,
    load: load,
    filter: filter,
    shuffle: shuffle,
    sample: sample,
    state: state
  };
})();
