/* app.js — utilità condivise + caricamento contenuti.
 * Unisce content/chapters-1.json e content/chapters-2.json con fetch.
 * Funziona anche se uno dei due manca: i capitoli assenti risultano
 * "contenuti in arrivo". Espone l'oggetto globale NCA.app. */

(function () {
  'use strict';

  var FILES = ['content/chapters-1.json', 'content/chapters-2.json'];

  /* Metadati statici: fallback quando i JSON non sono (ancora) disponibili
   * e sorgente di verità per ordine, aree e label dei 7 capitoli. */
  var CHAPTERS = [
    { id: 'ch1-transformer', n: 1, area: 'fondamenti',    short: 'Transformer',       title: 'Architettura Transformer' },
    { id: 'ch2-llm',         n: 2, area: 'fondamenti',    short: 'LLM',               title: 'Large Language Models' },
    { id: 'ch3-training',    n: 3, area: 'mlops',         short: 'Training',          title: 'Training e Fine-tuning' },
    { id: 'ch4-nvidia-tools',n: 4, area: 'mlops',         short: 'Tool NVIDIA',       title: 'Tool e stack NVIDIA' },
    { id: 'ch5-nlp',         n: 5, area: 'applicazioni',  short: 'NLP',               title: 'NLP applicata' },
    { id: 'ch6-metrics',     n: 6, area: 'mlops',         short: 'Metriche',          title: 'Metriche e valutazione' },
    { id: 'ch7-applications',n: 7, area: 'applicazioni',  short: 'Applicazioni',      title: 'Applicazioni GenAI' }
  ];

  var AREAS = {
    fondamenti:   { label: 'Fondamenti',    ids: ['ch1-transformer', 'ch2-llm'] },
    mlops:        { label: 'Pratica MLOps', ids: ['ch3-training', 'ch4-nvidia-tools', 'ch6-metrics'] },
    applicazioni: { label: 'Applicazioni',  ids: ['ch5-nlp', 'ch7-applications'] }
  };

  function isValidChapter(obj) {
    return obj && typeof obj.id === 'string' && typeof obj.title === 'string';
  }

  /** Carica e unisce i due JSON. Ritorna { chapters: Map id->oggetto, missing: [file...] }. */
  function loadContent() {
    return Promise.all(FILES.map(function (f) {
      return fetch(f)
        .then(function (res) {
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return res.json();
        })
        .then(function (json) { return { file: f, data: json }; })
        .catch(function (err) {
          console.warn('[app] ' + f + ' non caricato:', err.message);
          return { file: f, data: null };
        });
    })).then(function (results) {
      var map = {};
      var missing = [];
      results.forEach(function (r) {
        if (!Array.isArray(r.data)) { missing.push(r.file); return; }
        r.data.forEach(function (ch) {
          if (isValidChapter(ch)) map[ch.id] = ch;
          else console.warn('[app] voce capitolo non valida in ' + r.file + ':', ch);
        });
      });
      return { chapters: map, missing: missing };
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function el(tag, cls, html) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function getQueryParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  }

  window.NCA = window.NCA || {};
  window.NCA.app = {
    CHAPTERS: CHAPTERS,
    AREAS: AREAS,
    loadContent: loadContent,
    esc: esc,
    el: el,
    getQueryParam: getQueryParam,
    byId: function (id) {
      return CHAPTERS.filter(function (c) { return c.id === id; })[0] || null;
    }
  };
})();
