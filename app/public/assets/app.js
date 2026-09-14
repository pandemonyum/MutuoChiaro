/**
 * MutuoChiaro - client dell'interfaccia.
 *
 * Nessun calcolo finanziario e nessun dato precompilato: ogni numero, ogni
 * spiegazione e ogni evento arrivano dal runtime tramite le API del run.
 * Il runId e' condiviso fra le pagine tramite sessionStorage.
 */
(function () {
  'use strict';

  // ------------------------------------------------------------- formato
  const EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
  const EUR0 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0, useGrouping: 'always' });
  const NUM = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

  const eur = (n) => (n === null || n === undefined ? 'n.d.' : EUR.format(n));
  const eur0 = (n) => (n === null || n === undefined ? 'n.d.' : EUR0.format(n));
  const pct = (n) => (n === null || n === undefined ? 'n.d.' : NUM.format(n) + '%');

  const PROV = {
    USER_INPUT: ['source-user', 'Utente'],
    SYNTHETIC_OFFER: ['source-offer', 'Offerta'],
    CALCULATED: ['source-calc', 'Calcolo'],
    SCENARIO_ASSUMPTION: ['source-assumption', 'Ipotesi'],
    MISSING: ['source-missing', 'Mancante'],
  };

  /** Etichette leggibili: all'utente non si mostrano nomi tecnici di campo. */
  const FIELD_LABELS = {
    monthlyNetIncome: 'reddito netto mensile',
    otherMonthlyIncome: 'altre entrate mensili',
    existingMonthlyDebts: 'rate e debiti mensili gia attivi',
    savings: 'risparmi disponibili',
    emergencyFundMin: 'fondo di emergenza minimo',
    price: 'prezzo dell immobile',
    accessoryCosts: 'spese accessorie',
    plannedWorks: 'lavori previsti',
    requestedLoanAmount: 'importo del mutuo',
    assumedYears: 'durata ipotizzata',
    insuranceCost: 'costo della polizza obbligatoria',
    insuranceRequired: 'obbligo di polizza',
    arrangementFee: 'spese di istruttoria',
    appraisalFee: 'spese di perizia',
    declaredTaegPct: 'TAEG dichiarato',
    declaredInitialPayment: 'rata dichiarata',
    tanPct: 'TAN',
    maxLtvPct: 'rapporto prestito/valore massimo',
    amount: 'importo',
    years: 'durata',
    rateType: 'tipo di tasso',
    recurringMonthlyCost: 'costo ricorrente mensile',
  };
  const label = (field) => FIELD_LABELS[field] || field;
  const labelList = (fields) => (fields || []).map(label).join(', ');

  const PHASE_STEP = {
    START: 0, PROFILE_INCOMPLETE: 1, PROFILE_READY: 2, OFFERS_INCOMPLETE: 3,
    OFFERS_NORMALIZED: 4, SCENARIOS_READY: 5, UNDERSTANDING_CHECK: 6,
    AWAITING_HUMAN_CONFIRMATION: 7, COMPLETED: 8, ESCALATED: 8,
  };

  const SCENARIO_META = {
    BASE: { tab: 'base', short: 'Scenario base', hint: 'Dati attuali' },
    APPRAISAL_MINUS_10: { tab: 'appraisal', short: 'Perizia −10%', hint: 'Valore di perizia ipotizzato' },
    RATE_PLUS_2PP: { tab: 'rates', short: 'Tasso +2 punti', hint: 'Solo variabile' },
    INCOME_MINUS_20_6M: { tab: 'income', short: 'Reddito −20%', hint: 'Per sei mesi' },
  };

  // ------------------------------------------------------------- helpers
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function el(tag, props, children) {
    const node = document.createElement(tag);
    Object.entries(props || {}).forEach(([k, v]) => {
      if (v === null || v === undefined) return;
      if (k === 'class') node.className = v;
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    });
    [].concat(children || []).forEach((c) => { if (c) node.append(c); });
    return node;
  }

  function tag(provenance) {
    const [cls, label] = PROV[provenance] || PROV.MISSING;
    return el('span', { class: 'source-tag ' + cls, text: label });
  }

  /** Cella con valore, etichetta di provenienza e nota. */
  function cell(traced, format) {
    const value = traced && traced.value !== null && traced.value !== undefined
      ? (format || eur)(traced.value)
      : 'Non disponibile';
    const node = el('div', {}, [el('span', { class: 'cell-main', text: value })]);
    const sub = el('span', { class: 'cell-sub' }, [tag(traced ? traced.provenance : 'MISSING')]);
    if (traced && traced.note) sub.append(document.createTextNode(' ' + traced.note));
    node.append(sub);
    return node;
  }

  function icon(path) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = path;
    return svg;
  }
  const ICON_CHECK = '<path d="m5 12 4 4L19 6"/>';
  const ICON_WARN = '<path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/>';
  const ICON_INFO = '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>';

  function notice(kind, htmlContent) {
    return el('div', { class: 'notice notice-' + kind }, [
      icon(kind === 'warning' ? ICON_WARN : kind === 'success' ? ICON_CHECK : ICON_INFO),
      el('div', { html: htmlContent }),
    ]);
  }

  // ---------------------------------------------------------------- toast
  function showToast(title, message) {
    const toast = $('.toast');
    if (!toast) return;
    const body = toast.querySelector('div');
    if (!body) return;
    // Il primo <span> del toast è l'icona: il messaggio va in quello del corpo.
    body.querySelector('strong').textContent = title;
    body.querySelector('span').textContent = message;
    toast.classList.add('show');
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3600);
  }
  window.showToast = showToast;

  // ------------------------------------------------------------------ API
  const RUN_KEY = 'mutuochiaro.runId';

  async function api(method, path, body) {
    const res = await fetch(path, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Errore ' + res.status);
      err.payload = data;
      err.status = res.status;
      throw err;
    }
    return data;
  }

  const store = { meta: null, view: null, runId: null };

  async function ensureRun() {
    const saved = sessionStorage.getItem(RUN_KEY);
    if (saved) {
      try {
        store.view = await api('GET', '/api/run/' + saved);
        store.runId = saved;
        return;
      } catch (_) { /* run non più disponibile: se ne crea uno nuovo */ }
    }
    store.view = await api('POST', '/api/run');
    store.runId = store.view.state.runId;
    sessionStorage.setItem(RUN_KEY, store.runId);
  }

  async function act(method, path, body, toast) {
    try {
      store.view = await api(method, path, body);
      store.runId = store.view.state.runId;
      renderShell();
      renderPage();
      if (store.view.state.currentPhase === 'ESCALATED') {
        // Il server ha risposto 200 ma il run e' stato interrotto:
        // non va presentato come un aggiornamento riuscito.
        showToast('Run interrotto', store.view.state.escalation.reason || 'Il run è passato in ESCALATED.');
      } else if (toast) {
        showToast(toast[0], toast[1]);
      }
      return store.view;
    } catch (err) {
      const issues = (err.payload && err.payload.issues) || [];
      const detail = issues.map((i) => i.message).join(' ');
      showToast('Operazione rifiutata', (err.message + ' ' + detail).trim());
      // Lo stato del server resta la verità: si ricarica la vista reale.
      try {
        store.view = await api('GET', '/api/run/' + store.runId);
        renderShell();
        renderPage();
      } catch (_) { /* niente */ }
      throw err;
    }
  }

  // ------------------------------------------------------------- shell
  function renderShell() {
    const s = store.view.state;
    const page = document.body.dataset.page;
    $$('.side-link[data-page-link]').forEach((l) => l.classList.toggle('active', l.dataset.pageLink === page));

    const box = $('.side-progress');
    if (box) {
      const step = PHASE_STEP[s.currentPhase] || 0;
      const percent = Math.round((step / 8) * 100);
      box.replaceChildren(
        el('div', { class: 'row' }, [
          el('strong', { text: 'Run ' + s.runId }),
          el('span', { text: percent + '%' }),
        ]),
        el('div', { class: 'progress-track' }, [el('i', { style: 'width:' + percent + '%' })]),
        el('p', { text: 'Fase ' + s.currentPhase + '. ' + store.view.nextAction }),
      );
    }

    const blockers = store.view.completionBlockers || [];
    $$('[data-bind="phase"]').forEach((n) => { n.textContent = s.currentPhase; });
    $$('[data-bind="blockers"]').forEach((n) => { n.textContent = blockers.length ? blockers.join(' ') : 'Nessun requisito aperto.'; });
  }

  /** Un run interrotto viene dichiarato in testa alla pagina, non solo nel toast. */
  function renderEscalation() {
    const host = $('.page');
    if (!host) return;
    const existing = $('#escalation-banner');
    if (existing) existing.remove();
    const s = store.view.state;
    if (s.currentPhase !== 'ESCALATED') return;
    const banner = notice('warning',
      '<strong>Run interrotto.</strong> ' + (s.escalation.reason || '') +
      '<br>Il run è in uno stato terminale: nessun altro passaggio è consentito. Avvia un nuovo run per ripartire.');
    banner.id = 'escalation-banner';
    banner.style.marginBottom = '16px';
    banner.append(el('button', {
      class: 'btn btn-primary', type: 'button', style: 'margin-left:auto',
      text: 'Nuovo run',
      onclick: async () => {
        sessionStorage.removeItem(RUN_KEY);
        await ensureRun();
        renderShell(); renderEscalation(); renderPage();
        showToast('Nuovo run avviato', 'Persona sintetica ricaricata e traccia agentica azzerata.');
      },
    }));
    const head = $('.page-head');
    if (head && head.nextSibling) host.insertBefore(banner, head.nextSibling);
    else host.prepend(banner);
  }

  // -------------------------------------------------------------- pagine
  function renderPage() {
    renderEscalation();
    const page = document.body.dataset.page;
    const fn = PAGES[page];
    if (fn) fn(store.view.state, store.view);
  }

  const PAGES = {};

  // ---------------------------------------------------------- panoramica
  PAGES.home = function (s, view) {
    const host = $('[data-render="stats"]');
    if (host) {
      const stats = [
        ['teal', 'Dato utente', eur0(s.syntheticProfile.savings), 'Risparmi dichiarati'],
        ['blue', 'Immobile', eur0(s.property.price), 'Prezzo della casa'],
        ['purple', 'Sintetiche', String(s.offers.length), 'Offerte da comprendere'],
        ['gold', 'Soglia personale', eur0(s.syntheticProfile.emergencyFundMin), 'Fondo da preservare'],
      ];
      host.replaceChildren(...stats.map(([color, trend, value, label]) =>
        el('article', { class: 'card stat-card' }, [
          el('div', { class: 'stat-top' }, [
            el('span', { class: 'stat-icon ' + color }, [icon(ICON_CHECK)]),
            el('span', { class: 'trend', text: trend }),
          ]),
          el('div', { class: 'stat-value', text: value }),
          el('div', { class: 'stat-label', text: label }),
        ])));
    }

    const journey = $('[data-render="journey"]');
    if (journey) {
      const step = PHASE_STEP[s.currentPhase] || 0;
      const items = [
        { href: 'profilo.html', n: '01', title: 'Profilo economico', note: 'Reddito, risparmi e soglia di emergenza', at: 1 },
        { href: 'profilo.html', n: '02', title: 'Prossima domanda decisiva', note: s.selectedQuestion ? s.selectedQuestion.question : 'Nessun dato mancante con impatto', at: 2 },
        { href: 'offerte.html', n: '03', title: 'Offerte normalizzate', note: s.normalizedOffers.length ? s.normalizedOffers.length + ' offerte sullo stesso schema' : 'Non ancora normalizzate', at: 4 },
        { href: 'scenari.html', n: '04', title: 'Scenari', note: s.scenarios.length ? s.scenarios.length + ' scenari calcolati' : 'Perizia, tasso e reddito temporaneo', at: 5 },
        { href: 'comprensione.html', n: '05', title: 'Comprensione e conferma', note: 'Tre domande prima della conferma finale', at: 7 },
      ];
      journey.replaceChildren(...items.map((it) => {
        const done = step >= it.at;
        const active = !done && step >= it.at - 1;
        const status = done ? 'Completato' : active ? 'Da fare ora' : 'Non iniziato';
        return el('a', { class: 'journey-item' + (done ? ' done' : active ? ' active' : ''), href: it.href }, [
          el('span', { class: 'step-dot' }, [done ? icon(ICON_CHECK) : document.createTextNode(it.n)]),
          el('div', {}, [el('h4', { text: it.title }), el('p', { text: it.note })]),
          el('span', { class: 'status', text: status }),
        ]);
      }));
    }

    renderQuestionCard($('[data-render="question-home"]'), s, view);
  };

  /** Card della prossima domanda decisiva, condivisa fra panoramica e profilo. */
  function renderQuestionCard(host, s, view) {
    if (!host) return;
    host.replaceChildren();
    const q = s.selectedQuestion;

    // Nessun agente ancora invocato: il profilo non è stato valutato,
    // che è diverso dall'essere stato valutato e risultare completo.
    if (!q && !view.profileAgent) {
      host.append(
        el('span', { class: 'agent-chip', text: 'Profile & Property Agent' }),
        el('h3', { text: 'Profilo non ancora valutato' }),
        el('p', { text: 'Conferma il profilo per far analizzare i dati dall’agente: individuerà quali informazioni mancano e quale domanda ha il maggiore impatto sul confronto.' }),
        el('button', {
          class: 'btn btn-primary', type: 'button', style: 'margin-top:14px;width:100%',
          text: 'Valuta il profilo',
          onclick: () => act('POST', '/api/run/' + store.runId + '/profile', {},
            ['Profilo valutato', 'L’agente ha individuato i dati mancanti con impatto sul confronto.']),
        }),
      );
      return;
    }

    if (!q) {
      host.append(
        el('span', { class: 'agent-chip', text: 'Profile & Property Agent' }),
        el('h3', { text: 'Nessun dato mancante con impatto sul confronto' }),
        el('p', { text: 'Il profilo è sufficiente per il confronto. I dati ancora assenti riguardano le offerte e vanno chiesti alla banca.' }),
        el('p', { class: 'card-note', style: 'margin-top:10px', text: view.profileAgent.questionRationale }),
      );
      return;
    }
    const input = el('input', { type: 'number', min: '0', step: '10', 'aria-label': q.question });
    host.append(
      el('span', { class: 'agent-chip', text: 'Prossima domanda decisiva' }),
      el('h3', { text: q.question }),
      el('p', { text: q.why }),
      el('div', { class: 'answer-row' }, [
        el('button', { class: 'answer-btn', type: 'button', text: 'Nessuna', onclick: () => answer(q.field, 0) }),
        el('button', { class: 'answer-btn', type: 'button', text: '€ 280', onclick: () => answer(q.field, 280) }),
      ]),
      el('div', { class: 'input-wrap has-prefix', style: 'margin-top:10px' }, [
        el('span', { class: 'input-prefix', text: q.unit && q.unit.indexOf('€') === 0 ? '€' : '#' }),
        input,
      ]),
      el('button', {
        class: 'btn btn-primary', type: 'button', style: 'margin-top:12px;width:100%',
        text: 'Rispondi e ricalcola',
        onclick: () => answer(q.field, input.value === '' ? 0 : Number(input.value)),
      }),
      el('p', { class: 'card-note', style: 'margin-top:10px', text: 'Impatto dichiarato sul confronto: ' + q.decisionImpact + (view.profileAgent ? ' · ' + view.profileAgent.questionRationale : '') }),
    );
  }

  function answer(field, value) {
    return act('POST', '/api/run/' + store.runId + '/answer', { field: field, value: value },
      ['Dato acquisito', 'Il confronto è stato ricalcolato con il nuovo valore.']);
  }

  // -------------------------------------------------------------- profilo
  PAGES.profile = function (s, view) {
    const form = $('[data-render="profile-form"]');
    if (form) {
      const values = {
        monthlyNetIncome: s.syntheticProfile.monthlyNetIncome,
        otherMonthlyIncome: s.syntheticProfile.otherMonthlyIncome,
        existingMonthlyDebts: s.syntheticProfile.existingMonthlyDebts,
        savings: s.syntheticProfile.savings,
        emergencyFundMin: s.syntheticProfile.emergencyFundMin,
        price: s.property.price,
        accessoryCosts: s.property.accessoryCosts,
        plannedWorks: s.property.plannedWorks,
        requestedLoanAmount: s.property.requestedLoanAmount,
        assumedYears: s.property.assumedYears,
      };
      Object.entries(values).forEach(([name, value]) => {
        const input = form.querySelector('[name="' + name + '"]');
        if (input && document.activeElement !== input) {
          input.value = value === null || value === undefined ? '' : value;
        }
      });
    }

    renderQuestionCard($('[data-render="question-profile"]'), s, view);

    const completeness = $('[data-render="completeness"]');
    if (completeness && view.profileAgent) {
      const issues = view.profileAgent.issues || [];
      const total = 10;
      const percent = Math.round(((total - issues.length) / total) * 100);
      const ring = el('div', { class: 'completion-ring', style: '--pct:' + percent }, [
        el('div', { class: 'inside' }, [el('strong', { text: percent + '%' }), el('span', { text: 'completo' })]),
      ]);
      const list = el('div', { class: 'tradeoff-list', style: 'flex:1' });
      list.append(el('div', { class: 'tradeoff' }, [
        el('span', { class: 'tradeoff-icon' }, [icon(ICON_CHECK)]),
        el('div', {}, [el('h4', { text: (total - issues.length) + ' dati disponibili' }), el('p', { text: 'Validati dal Profile & Property Agent' })]),
      ]));
      issues.slice(0, 3).forEach((issue) => {
        list.append(el('div', { class: 'tradeoff' }, [
          el('span', { class: 'tradeoff-icon', style: 'background:var(--coral-soft);color:var(--coral)' }, [icon(ICON_WARN)]),
          el('div', {}, [el('h4', { text: label(issue.field) }), el('p', { text: issue.message })]),
        ]));
      });
      completeness.replaceChildren(
        el('div', { style: 'display:flex;align-items:center;justify-content:space-around;gap:20px;flex-wrap:wrap' }, [ring, list]),
      );
    }

    const summary = $('[data-render="profile-summary"]');
    if (summary && view.profileAgent) {
      const d = view.profileAgent.derived;
      summary.replaceChildren(
        el('div', { class: 'card-head' }, [el('div', {}, [
          el('h3', { text: 'Cosa risulta dai dati inseriti' }),
          el('p', { text: 'Confidenza dichiarata dall’agente: ' + NUM.format(s.confidence) }),
        ])]),
        el('div', { class: 'grid grid-2' }, [
          statBox(eur0(d.totalMonthlyIncome), 'Entrate mensili totali'),
          statBox(eur0(d.downPayment), 'Anticipo a tuo carico'),
          statBox(eur0(d.cashNeededBeforeOfferCosts), 'Contanti prima dei costi d’offerta'),
          statBox(d.loanToPricePct === null ? 'n.d.' : pct(d.loanToPricePct), 'Mutuo / prezzo'),
        ]),
        el('ul', { class: 'card-note', style: 'margin:12px 0 0;padding-left:18px' },
          (view.profileAgent.summaryForUser || []).map((t) => el('li', { text: t }))),
      );
    }
  };

  function statBox(value, label) {
    return el('div', { class: 'stat-card', style: 'padding:0' }, [
      el('div', { class: 'stat-value', text: value }),
      el('div', { class: 'stat-label', text: label }),
    ]);
  }

  function saveProfile(form) {
    const payload = {};
    const problems = [];
    $$('input[name], select[name]', form).forEach((input) => {
      if (input.disabled) return;
      const raw = input.value;
      if (raw !== '') {
        const n = Number(raw);
        if (!isFinite(n)) problems.push(label(input.name) + ': valore non numerico');
        else if (n < 0) problems.push(label(input.name) + ': non sono ammessi importi negativi');
        else if (input.name === 'monthlyNetIncome' && n === 0) problems.push('il reddito netto mensile deve essere maggiore di zero');
        else if (input.name === 'assumedYears' && (n < 1 || n > 40)) problems.push('la durata deve essere compresa fra 1 e 40 anni');
      }
      payload[input.name] = raw === '' ? null : raw;
    });
    // I valori impossibili vengono fermati qui: il runtime li rifiuterebbe
    // interrompendo il run, e un refuso non deve costare la sessione.
    if (problems.length > 0) {
      const box = $('[data-render="profile-errors"]');
      if (box) box.replaceChildren(notice('warning', '<strong>Correggi questi valori:</strong> ' + problems.join('; ') + '.'));
      showToast('Valori non ammessi', problems.join('; '));
      return Promise.resolve();
    }
    const box = $('[data-render="profile-errors"]');
    if (box) box.replaceChildren();
    return act('POST', '/api/run/' + store.runId + '/profile', payload,
      ['Profilo aggiornato', 'L’orchestratore ha rivalutato dati mancanti e prossima azione.']);
  }

  // -------------------------------------------------------------- offerte
  PAGES.offers = function (s, view) {
    const warn = $('[data-render="offers-warning"]');
    if (warn) {
      const partial = s.offerValidations.filter((v) => v.partial);
      warn.replaceChildren();
      partial.forEach((v) => {
        const offer = s.offers.find((o) => o.id === v.offerId);
        warn.append(notice('warning',
          '<strong>Una comparazione è parziale.</strong> L’offerta ' + (offer ? offer.displayName : v.offerId) +
          ' non riporta: ' + labelList(v.missingFields) + '. Il valore non viene inventato.' +
          (v.questionForBank ? '<br><em>Domanda da porre alla banca: ' + v.questionForBank + '</em>' : '')));
      });
    }

    const grid = $('[data-render="offer-cards"]');
    if (grid) {
      grid.replaceChildren(...s.normalizedOffers.map((n) => {
        const offer = s.offers.find((o) => o.id === n.offerId) || {};
        const rows = n.rows;
        const card = el('article', { class: 'card offer-card' }, [
          el('div', {}, [
            el('div', { class: 'offer-top' }, [
              el('span', { class: 'offer-logo ' + (offer.code === 'SA' ? 'a' : offer.code === 'CL' ? 'b' : 'c'), text: offer.code || '??' }),
              el('span', { class: 'source-tag source-offer', text: 'Offerta sintetica' }),
            ]),
            el('h3', { text: n.displayName }),
            el('div', { class: 'subtitle', text: (offer.bankName || '') + ' · ' + (n.rateType === 'FIXED' ? 'tasso fisso' : 'tasso variabile') + ' · ' + (rows.durataAnni.value || '?') + ' anni' }),
          ]),
          el('div', { class: 'rate-block' }, [
            el('strong', { text: eur(rows.rataIniziale.value) }),
            el('span', { text: 'rata iniziale mensile · calcolo deterministico' }),
          ]),
          el('div', { class: 'offer-metrics' }, [
            metric('TAN', pct(rows.tan.value)),
            metric('TAEG dichiarato', pct(rows.taegDichiarato.value)),
            metric('Costo simulato', n.partial ? 'Parziale' : eur0(rows.costoTotaleSimulato.value)),
            metric('Liquidità residua', eur0(rows.liquiditaResidua.value)),
          ]),
        ]);
        if (n.missingFields.length) {
          card.append(el('div', { class: 'missing-banner' }, [
            icon(ICON_WARN),
            el('span', { text: 'Dati non presenti nell’offerta: ' + labelList(n.missingFields) + '. Non vengono stimati.' }),
          ]));
        }
        card.append(el('div', { class: 'offer-foot' }, [
          el('span', { class: 'type-pill' + (n.rateType === 'VARIABLE' ? ' variable' : '') },
            [document.createTextNode(rows.sensibilitaScenari.note || (n.rateType === 'VARIABLE' ? 'Sensibile ai tassi' : 'Rata stabile'))]),
        ]));
        return card;
      }));
    }

    const table = $('[data-render="offers-table"]');
    if (table && store.meta) {
      const order = store.meta.rowOrder;
      const labels = store.meta.rowLabels;
      const fmt = {
        rataIniziale: eur, margineMensile: eur, costoTotaleSimulato: eur0,
        interessiTotaliSimulati: eur0, costiIniziali: eur0, liquiditaResidua: eur0,
        tan: pct, taegDichiarato: pct, rapportoRataReddito: pct,
        durataAnni: (v) => v + ' anni',
      };
      const metricOf = {
        rataIniziale: 'monthly', margineMensile: 'monthly', rapportoRataReddito: 'monthly',
        costoTotaleSimulato: 'total', interessiTotaliSimulati: 'total', costiIniziali: 'total',
        liquiditaResidua: 'liquidity',
      };
      const head = el('tr', {}, [el('th', { text: 'Voce' })]);
      s.normalizedOffers.forEach((n) => head.append(el('th', {}, [
        document.createTextNode(n.displayName),
        n.partial ? el('span', { class: 'source-tag source-missing', style: 'margin-left:6px', text: 'Parziale' }) : null,
      ])));
      const body = el('tbody');
      order.forEach((key) => {
        const tr = el('tr', {}, [el('th', { text: labels[key] || key })]);
        s.normalizedOffers.forEach((n) => {
          const traced = n.rows[key];
          const td = el('td', { 'data-metric': metricOf[key] || '' });
          if (key === 'tipoTasso' || key === 'sensibilitaScenari') {
            td.append(el('span', { class: 'type-pill' + (n.rateType === 'VARIABLE' ? ' variable' : ''), text: traced.note || 'n.d.' }));
          } else {
            td.append(cell(traced, fmt[key] || eur));
          }
          tr.append(td);
        });
        body.append(tr);
      });
      const missingRow = el('tr', {}, [el('th', { text: 'Dato da chiedere alla banca' })]);
      s.normalizedOffers.forEach((n) => {
        const v = s.offerValidations.find((x) => x.offerId === n.offerId);
        missingRow.append(el('td', {}, v && v.questionForBank
          ? [el('span', { class: 'source-tag source-missing', text: 'Mancante' }), el('span', { class: 'cell-sub', text: v.questionForBank })]
          : [document.createTextNode('—')]));
      });
      body.append(missingRow);
      table.replaceChildren(el('thead', {}, [head]), body);
    }

    const notes = $('[data-render="offers-notes"]');
    if (notes && view.clarity) {
      notes.replaceChildren(...view.clarity.perOffer.map((p) => {
        const n = s.normalizedOffers.find((x) => x.offerId === p.offerId);
        return el('article', { class: 'card card-pad' }, [
          el('h4', { style: 'margin:0 0 8px', text: n ? n.displayName : p.offerId }),
          el('ul', { class: 'card-note', style: 'margin:0;padding-left:18px' }, p.lines.map((l) => el('li', { text: l }))),
        ]);
      }));
    }

    const editor = $('[data-render="offer-editor"]');
    if (editor && !editor.dataset.ready) {
      const select = $('#offer-select', editor);
      s.offers.forEach((o) => select.append(el('option', { value: o.id, text: o.displayName })));
      editor.dataset.ready = '1';
      $('#offer-form', editor).addEventListener('submit', (ev) => {
        ev.preventDefault();
        const field = $('#offer-field', editor).value;
        const raw = $('#offer-value', editor).value;
        act('POST', '/api/run/' + store.runId + '/offers/' + select.value,
          Object.fromEntries([[field, raw === '' ? null : raw]]),
          ['Offerta modificata', 'Il valore è ora etichettato come dato inserito e le offerte sono state rivalidate.']);
      });
    }
  };

  function metric(label, value) {
    return el('div', { class: 'metric' }, [el('small', { text: label }), el('b', { text: value })]);
  }

  // --------------------------------------------------------- mutuospecchio
  PAGES.mirror = function (s, view) {
    const focusId = sessionStorage.getItem('mutuochiaro.focusOffer') || (s.normalizedOffers[0] && s.normalizedOffers[0].offerId);
    const focus = s.normalizedOffers.find((n) => n.offerId === focusId) || s.normalizedOffers[0];

    const stage = $('[data-render="mirror-stage"]');
    if (stage && focus) {
      const offer = s.offers.find((o) => o.id === focus.offerId) || {};
      const extra = (s.property.accessoryCosts || 0) + (s.property.plannedWorks || 0);
      stage.replaceChildren(
        el('div', { class: 'orbit-node person' }, [
          el('div', { class: 'node-label' }, [document.createTextNode('Persona')]),
          el('div', { class: 'node-value', text: eur0(s.syntheticProfile.monthlyNetIncome) + ' / mese' }),
          el('div', { class: 'node-note', text: s.syntheticProfile.existingMonthlyDebts === null ? 'Reddito dichiarato · rate da completare' : 'Reddito dichiarato · rate attive ' + eur0(s.syntheticProfile.existingMonthlyDebts) }),
        ]),
        el('div', { class: 'orbit-node home' }, [
          el('div', { class: 'node-label' }, [document.createTextNode('Casa')]),
          el('div', { class: 'node-value', text: eur0(s.property.price) }),
          el('div', { class: 'node-note', text: 'Prezzo · ' + eur0(extra) + ' tra spese e lavori' }),
        ]),
        el('div', { class: 'mirror-center' }, [el('div', {}, [
          el('strong', { text: 'MutuoSpecchio' }), el('span', { text: 'Impatto nella tua situazione' }),
        ])]),
        el('div', { class: 'orbit-node offer' }, [
          el('div', { class: 'node-label' }, [document.createTextNode('Offerta osservata')]),
          el('div', { class: 'node-value', text: focus.displayName }),
          el('div', { class: 'node-note', text: (offer.bankName || '') + ' · ' + (focus.rateType === 'FIXED' ? 'tasso fisso' : 'tasso variabile') + ' · ' + focus.rows.durataAnni.value + ' anni' }),
        ]),
      );
    }

    const picker = $('[data-render="mirror-picker"]');
    if (picker) {
      picker.replaceChildren(...s.normalizedOffers.map((n) =>
        el('button', {
          class: 'btn ' + (focus && n.offerId === focus.offerId ? 'btn-primary' : 'btn-secondary'),
          type: 'button', text: n.displayName,
          onclick: () => { sessionStorage.setItem('mutuochiaro.focusOffer', n.offerId); renderPage(); },
        })));
    }

    const effect = $('[data-render="mirror-effect"]');
    if (effect && focus) {
      const r = focus.rows;
      const gap = r.liquiditaResidua.value === null || s.syntheticProfile.emergencyFundMin === null
        ? null : r.liquiditaResidua.value - s.syntheticProfile.emergencyFundMin;
      effect.replaceChildren(
        statBox(eur(r.rataIniziale.value), 'Rata mensile'),
        statBox(pct(r.rapportoRataReddito.value), 'Rata / reddito'),
        statBox(eur0(r.liquiditaResidua.value), 'Liquidità residua'),
        statBox(gap === null ? 'n.d.' : eur0(gap), gap !== null && gap < 0 ? 'Sotto la soglia personale' : 'Oltre la soglia personale'),
      );
    }

    const alerts = $('[data-render="mirror-alerts"]');
    if (alerts && focus) {
      alerts.replaceChildren();
      if (s.syntheticProfile.existingMonthlyDebts === null) {
        alerts.append(notice('warning', '<strong>Margine da completare.</strong><br>Le rate già attive non sono state dichiarate: il margine mensile mostrato è più alto di quello reale.'));
      }
      const breach = focus.rows.liquiditaResidua.value !== null &&
        s.syntheticProfile.emergencyFundMin !== null &&
        focus.rows.liquiditaResidua.value < s.syntheticProfile.emergencyFundMin;
      if (breach) {
        alerts.append(notice('warning', '<strong>Liquidità sotto la soglia impostata.</strong><br>Con questa offerta la liquidità residua è ' +
          eur0(focus.rows.liquiditaResidua.value) + ', sotto il fondo di emergenza di ' + eur0(s.syntheticProfile.emergencyFundMin) + ' che hai indicato.'));
      }
      if (focus.partial) {
        alerts.append(notice('warning', '<strong>Confronto parziale.</strong><br>Mancano: ' + labelList(focus.missingFields) + '. I totali che dipendono da questi dati restano incompleti.'));
      }
    }

    const obs = $('[data-render="mirror-observations"]');
    if (obs && view.clarity && focus) {
      const lines = (view.clarity.perOffer.find((p) => p.offerId === focus.offerId) || { lines: [] }).lines
        .concat(view.clarity.crossOffer);
      obs.replaceChildren(...lines.slice(0, 6).map((t) =>
        el('article', { class: 'card card-pad' }, [
          el('div', { class: 'tradeoff' }, [
            el('span', { class: 'tradeoff-icon' }, [icon(ICON_INFO)]),
            el('div', {}, [el('p', { style: 'margin:0', text: t })]),
          ]),
        ])));
    }

    const ba = $('[data-render="mirror-beforeafter"]');
    if (ba && view.metrics) {
      const m = view.metrics.beforeAfter;
      ba.replaceChildren(
        el('section', { class: 'card card-pad', style: 'background:#fbfcfc' }, [
          el('span', { class: 'source-tag source-offer', text: 'Prima' }),
          el('h3', { style: 'margin:15px 0 8px', text: '“' + s.before.answer + '”' }),
          el('p', { class: 'card-note', text: 'Criteri di confronto usati: ' + m.before.criteriaCount + ' (' + m.before.comparisonCriteriaUsed.join(', ') + '). Termini spiegati: ' + m.before.termsExplained + '. Dati mancanti individuati: ' + m.before.missingDataKnownToUser + '.' }),
        ]),
        el('section', { class: 'card card-pad', style: 'border-color:#bfe4dc;background:#f2fbf8' }, [
          el('span', { class: 'source-tag source-calc', text: 'Dopo' }),
          el('h3', { style: 'margin:15px 0 8px', text: 'Stesso confronto su ' + m.after.criteriaCount + ' criteri' }),
          el('p', { class: 'card-note', text: 'Termini spiegati: ' + m.after.termsExplained + '. Dati mancanti individuati: ' + m.after.missingDataKnownToUser + '. Concetti verificati: ' + view.metrics.conceptsUnderstoodCount + ' su 3.' }),
        ]),
      );
    }
  };

  // -------------------------------------------------------------- scenari
  PAGES.scenarios = async function (s, view) {
    if (s.scenarios.length < 4 && !document.body.dataset.loadingScenarios &&
        ['OFFERS_NORMALIZED', 'SCENARIOS_READY'].indexOf(s.currentPhase) >= 0) {
      document.body.dataset.loadingScenarios = '1';
      try { await act('POST', '/api/run/' + store.runId + '/scenarios', {}); } catch (_) { /* mostrato via toast */ }
      delete document.body.dataset.loadingScenarios;
      return;
    }

    const active = sessionStorage.getItem('mutuochiaro.scenario') || 'BASE';
    const current = s.scenarios.find((x) => x.scenarioId === active) || s.scenarios[0];

    const tabs = $('[data-render="scenario-tabs"]');
    if (tabs) {
      tabs.replaceChildren(...s.scenarios.map((sc) => {
        const meta = SCENARIO_META[sc.scenarioId] || { short: sc.label, hint: '' };
        return el('button', {
          class: 'scenario-tab' + (current && sc.scenarioId === current.scenarioId ? ' active' : ''),
          type: 'button',
          onclick: () => { sessionStorage.setItem('mutuochiaro.scenario', sc.scenarioId); renderPage(); },
        }, [
          el('strong', { text: meta.short }),
          el('span', { text: meta.hint }),
        ]);
      }));
    }
    if (!current) return;

    const focusId = sessionStorage.getItem('mutuochiaro.focusOffer') || current.offers[0].offerId;
    const focus = current.offers.find((o) => o.offerId === focusId) || current.offers[0];

    const hero = $('[data-render="scenario-hero"]');
    if (hero) {
      const heroMeta = SCENARIO_META[current.scenarioId] || { short: current.label };
      hero.replaceChildren(
        el('span', { class: 'scenario-label', text: heroMeta.short }),
        el('h2', { text: current.label }),
        el('p', { text: 'Offerta osservata: ' + focus.displayName + '. Ogni valore riporta la propria provenienza.' }),
        el('div', { class: 'scenario-kpis' }, [
          kpi('Rata mensile', eur(focus.monthlyPayment.value), focus.displayName, focus.monthlyPayment.provenance),
          kpi('Rata / reddito', pct(focus.paymentToIncomePct.value), 'sul reddito considerato', focus.paymentToIncomePct.provenance),
          kpi('Liquidità residua', eur0(focus.liquidityRemaining.value), 'dopo l’acquisto', focus.liquidityRemaining.provenance),
        ]),
      );
    }

    const bars = $('[data-render="scenario-bars"]');
    if (bars) {
      const income = (s.syntheticProfile.monthlyNetIncome || 0) + (s.syntheticProfile.otherMonthlyIncome || 0);
      const savings = s.syntheticProfile.savings || 1;
      const rows = [
        ['Impegno mensile', pct(focus.paymentToIncomePct.value), clamp(focus.paymentToIncomePct.value)],
        ['Margine mensile', eur(focus.monthlyMargin.value), clamp((focus.monthlyMargin.value / income) * 100)],
        ['Liquidità residua', eur0(focus.liquidityRemaining.value), clamp((focus.liquidityRemaining.value / savings) * 100)],
      ];
      bars.replaceChildren(...rows.map(([label, value, width]) =>
        el('div', { class: 'chart-row' }, [
          el('div', { class: 'chart-label' }, [el('span', { text: label }), el('b', { text: value })]),
          el('div', { class: 'bar-track' }, [el('div', { class: 'bar-fill', style: 'width:' + width + '%' })]),
        ])));
    }

    const explain = $('[data-render="scenario-explain"]');
    if (explain) {
      const note = (view.clarity && view.clarity.scenarioNotes.find((n) => n.indexOf(current.label) === 0)) || '';
      explain.replaceChildren(
        el('h4', { text: 'Ipotesi dichiarate' }),
        el('ul', { style: 'margin:6px 0 0;padding-left:18px' }, current.assumptions.map((a) => el('li', { text: a }))),
        note ? el('p', { style: 'margin-top:10px', text: note }) : null,
      );
    }

    const warns = $('[data-render="scenario-warnings"]');
    if (warns) {
      warns.replaceChildren();
      current.warnings.forEach((w) => warns.append(notice('warning', w)));
    }

    const table = $('[data-render="scenario-table"]');
    if (table) {
      const head = el('tr', {}, [el('th', { text: 'Offerta' })]);
      s.scenarios.forEach((sc) => head.append(el('th', { text: (SCENARIO_META[sc.scenarioId] || {}).short || sc.label })));
      const body = el('tbody');
      s.normalizedOffers.forEach((n) => {
        const tr = el('tr', {}, [el('th', {}, [
          document.createTextNode(n.displayName),
          n.partial ? el('span', { class: 'source-tag source-missing', style: 'margin-left:6px', text: 'Parziale' }) : null,
        ])]);
        s.scenarios.forEach((sc) => {
          const row = sc.offers.find((o) => o.offerId === n.offerId);
          tr.append(el('td', {}, row ? [cell(row.monthlyPayment, eur)] : [document.createTextNode('—')]));
        });
        body.append(tr);
      });
      const liq = el('tr', {}, [el('th', { text: 'Liquidità iniziale necessaria' })]);
      s.scenarios.forEach((sc) => {
        const row = sc.offers.find((o) => o.offerId === focus.offerId);
        liq.append(el('td', {}, row ? [cell(row.liquidityNeeded, eur0)] : [document.createTextNode('—')]));
      });
      body.append(liq);
      table.replaceChildren(el('thead', {}, [head]), body);
    }
  };

  function kpi(label, value, note, provenance) {
    return el('div', { class: 'scenario-kpi' }, [
      el('small', { text: label }),
      el('b', { text: value }),
      el('em', {}, [document.createTextNode(note + ' '), tag(provenance)]),
    ]);
  }
  function clamp(n) {
    if (n === null || n === undefined || !isFinite(n)) return 0;
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  // --------------------------------------------------------- comprensione
  PAGES.understanding = function (s, view) {
    const list = $('[data-render="quiz"]');
    const result = s.comprehensionResult;
    const canAnswer = s.currentPhase === 'UNDERSTANDING_CHECK' && result.attemptsUsed < result.maxAttempts;

    if (list && store.meta) {
      list.replaceChildren();
      if (s.currentPhase === 'SCENARIOS_READY') {
        list.append(el('div', { class: 'card card-pad' }, [
          el('h3', { text: 'Il controllo di comprensione non è ancora avviato' }),
          el('p', { class: 'card-note', text: 'Serve almeno uno scenario calcolato. Avvia il controllo per rispondere alle tre domande.' }),
          el('button', {
            class: 'btn btn-primary', type: 'button', style: 'margin-top:12px',
            text: 'Avvia il controllo di comprensione',
            onclick: () => act('POST', '/api/run/' + store.runId + '/understanding/start', {},
              ['Controllo avviato', 'Rispondi alle tre domande per verificare i concetti.']),
          }),
        ]));
      } else if (['START', 'PROFILE_INCOMPLETE', 'PROFILE_READY', 'OFFERS_INCOMPLETE', 'OFFERS_NORMALIZED'].indexOf(s.currentPhase) >= 0) {
        list.append(el('div', { class: 'card card-pad' }, [
          el('h3', { text: 'Prima servono gli scenari' }),
          el('p', { class: 'card-note', text: store.view.nextAction }),
          el('a', { class: 'btn btn-primary', href: 'scenari.html', style: 'margin-top:12px', text: 'Vai agli scenari' }),
        ]));
      }

      store.meta.quiz.forEach((q, i) => {
        const wrong = result.feedback.find((f) => f.questionId === q.id);
        const card = el('article', { class: 'card quiz-card' }, [
          el('span', { class: 'quiz-number', text: String(i + 1).padStart(2, '0') }),
          el('h3', { text: q.prompt }),
        ]);
        const opts = el('div', { class: 'quiz-options' });
        q.options.forEach((o) => {
          const btn = el('button', {
            class: 'quiz-option', type: 'button', 'data-question': q.id, 'data-option': o.id,
            disabled: canAnswer ? null : 'disabled',
          }, [el('span', { class: 'radio' }), document.createTextNode(o.text)]);
          btn.addEventListener('click', () => {
            $$('[data-question="' + q.id + '"]', opts).forEach((b) => b.classList.remove('selected'));
            btn.classList.add('selected');
          });
          opts.append(btn);
        });
        card.append(opts);
        const fb = el('div', { class: 'quiz-feedback' });
        if (result.status !== 'NOT_STARTED') {
          if (wrong) {
            fb.className = 'quiz-feedback show wrong';
            fb.append(el('strong', { text: 'Da rivedere: ' + wrong.concept + '. ' }), document.createTextNode(wrong.explanation));
            fb.append(el('div', {}, [el('button', {
              class: 'btn btn-secondary', type: 'button', style: 'margin-top:10px',
              text: 'Riapri lo scenario collegato',
              onclick: () => { sessionStorage.setItem('mutuochiaro.scenario', wrong.reopenScenario); location.href = 'scenari.html'; },
            })]));
          } else if (result.conceptsUnderstood.indexOf(q.concept) >= 0) {
            fb.className = 'quiz-feedback show correct';
            fb.append(el('strong', { text: 'Corretto. ' }), document.createTextNode('Concetto verificato: ' + q.concept + '.'));
          }
        }
        card.append(fb);
        list.append(card);
      });

      if (canAnswer) {
        list.append(el('button', {
          class: 'btn btn-primary', type: 'button', style: 'width:100%',
          text: 'Verifica le risposte (tentativo ' + (result.attemptsUsed + 1) + ' di ' + result.maxAttempts + ')',
          onclick: () => {
            const answers = {};
            $$('.quiz-option.selected').forEach((b) => { answers[b.dataset.question] = b.dataset.option; });
            if (Object.keys(answers).length < store.meta.quiz.length) {
              showToast('Risposte incomplete', 'Seleziona una risposta per ciascuna delle tre domande.');
              return;
            }
            act('POST', '/api/run/' + store.runId + '/understanding', { answers: answers });
          },
        }));
      }
    }

    const status = $('[data-render="quiz-status"]');
    if (status) {
      const labels = {
        NOT_STARTED: 'Controllo non ancora svolto.',
        IN_PROGRESS: 'Tentativo ' + result.attemptsUsed + ' di ' + result.maxAttempts + ' non superato. Puoi riprovare.',
        PASSED: 'Controllo superato al tentativo ' + result.attemptsUsed + ' di ' + result.maxAttempts + '.',
        NOT_VERIFIED: 'Comprensione non verificata dopo ' + result.attemptsUsed + ' tentativi. I risultati restano consultabili.',
      };
      const done = result.conceptsUnderstood.length;
      status.replaceChildren(
        el('div', { class: 'card-head' }, [
          el('div', {}, [el('h3', { text: 'Stato comprensione' }), el('p', { text: labels[result.status] })]),
          el('b', { style: 'font-size:18px', text: done + ' / ' + store.meta.quiz.length }),
        ]),
        el('div', { class: 'progress-track', style: 'background:#e5edef' },
          [el('i', { style: 'width:' + (done / store.meta.quiz.length * 100) + '%' })]),
        el('p', { class: 'card-note', text: 'Massimo ' + result.maxAttempts + ' tentativi. Al limite lo stato diventa esplicito e i risultati restano consultabili.' }),
      );
    }

    const gate = $('[data-render="gate"]');
    if (gate) {
      const blockers = view.completionBlockers || [];
      const done = s.currentPhase === 'COMPLETED';
      const ready = s.currentPhase === 'AWAITING_HUMAN_CONFIRMATION';
      const check = el('input', { type: 'checkbox', disabled: done || !ready ? 'disabled' : null });
      const button = el('button', {
        class: 'btn btn-primary', type: 'button', style: 'width:100%;margin-top:15px',
        disabled: 'disabled',
        text: done ? 'Conferma registrata' : 'Confermo e chiudo la sessione',
      });
      if (done) check.checked = true;
      check.addEventListener('change', () => { button.disabled = !check.checked; });
      button.addEventListener('click', () => act('POST', '/api/run/' + store.runId + '/approve',
        { confirmed: true, actor: 'utente-demo' },
        ['Human gate completato', 'Il run è passato allo stato COMPLETED.']));

      gate.replaceChildren(
        el('div', { class: 'card-head', style: 'margin-bottom:8px' }, [el('div', {}, [
          el('h2', { text: 'Conferma umana finale' }),
          el('p', { text: 'Il sistema non può completare il run al posto tuo.' }),
        ])]),
        notice('warning', 'MutuoChiaro non fornisce consulenza finanziaria e non prevede l’approvazione della banca. Non ti viene chiesto di indicare un’offerta vincente.'),
        blockers.length
          ? notice('info', '<strong>Requisiti ancora aperti:</strong> ' + blockers.join(' '))
          : notice('success', 'Tutti i requisiti tecnici sono soddisfatti: manca solo la tua conferma.'),
        el('label', { class: 'checkbox-row' }, [check, el('span', { text: view.humanGateStatement })]),
        button,
      );
    }
  };

  // -------------------------------------------------------------- traccia
  PAGES.trace = function (s, view) {
    const head = $('[data-render="trace-head"]');
    if (head) {
      head.replaceChildren(
        el('div', {}, [
          el('h2', { text: 'Run ' + s.runId }),
          el('p', { text: 'Fase corrente: ' + s.currentPhase + ' · ' + (view.events || []).length + ' eventi reali' }),
        ]),
        el('span', { class: 'live-pill', text: 'Event stream del runtime' }),
      );
    }

    const list = $('[data-render="trace-list"]');
    if (list) {
      const filter = ($('#trace-filter') && $('#trace-filter').value || '').toLowerCase();
      const events = (view.events || []).filter((e) =>
        !filter || (e.kind + ' ' + e.actor + ' ' + e.message).toLowerCase().indexOf(filter) >= 0);
      list.replaceChildren(...events.map((e) => {
        const dot = e.status === 'failed' ? 'fail'
          : e.kind.indexOf('tool.') === 0 ? 'tool'
            : (e.kind.indexOf('missing') === 0 || e.kind.indexOf('offer.') === 0 || e.kind.indexOf('safety') === 0 || e.kind.indexOf('human_approval') === 0) ? 'warn'
              : 'agent';
        const refs = el('span', { class: 'trace-refs' });
        if (e.inputRef) refs.append(refBtn('input', e.inputRef));
        if (e.outputRef) refs.append(refBtn('output', e.outputRef));
        if (!e.inputRef && !e.outputRef) refs.append(document.createTextNode('nessun artifact'));
        return el('div', { class: 'trace-event', 'data-component': componentOf(e) }, [
          el('span', { class: 'trace-time', text: new Date(e.ts).toLocaleTimeString('it-IT', { hour12: false }) }),
          el('span', { class: 'trace-dot ' + dot }),
          el('div', { class: 'trace-copy' }, [
            el('strong', { text: '#' + e.seq + ' ' + e.kind }),
            el('span', { text: e.actor + ' · ' + e.message }),
            refs,
          ]),
          el('span', { class: 'trace-duration', text: e.durationMs === undefined ? (e.phaseAfter || '—') : NUM.format(e.durationMs) + ' ms' }),
        ]);
      }));
      const count = $('[data-render="trace-count"]');
      if (count) count.textContent = events.length + ' eventi su ' + (view.events || []).length;
    }

    const counts = $('[data-render="trace-counts"]');
    if (counts && view.invocationCounts) {
      counts.replaceChildren(...Object.entries(view.invocationCounts).map(([name, n]) =>
        el('span', { class: 'source-tag ' + (n > 0 ? 'source-calc' : 'source-missing'), text: name + ': ' + n })));
    }
  };

  function componentOf(e) {
    if (e.actor.indexOf('profile-property-agent') >= 0) return 'profile-agent';
    if (e.actor.indexOf('offer-clarity-agent') >= 0) return 'offer-agent';
    if (e.kind.indexOf('human_approval') === 0) return 'gate';
    if (e.actorKind === 'tool' || e.actorKind === 'skill') return 'tools';
    if (e.actorKind === 'orchestrator') return 'orchestrator';
    return 'ui';
  }

  function refBtn(kind, ref) {
    return el('button', {
      type: 'button', class: 'ref-btn', title: 'Apri ' + ref,
      text: kind + ':' + ref.split(':').slice(-2).join(':'),
      onclick: async () => {
        try {
          const artifact = await api('GET', '/api/artifact/' + encodeURIComponent(ref));
          const dialog = $('#artifact-dialog');
          $('#artifact-title').textContent = artifact.component + ' · ' + artifact.direction + ' · ' + ref;
          $('#artifact-body').textContent = JSON.stringify(artifact.payload, null, 2);
          dialog.hidden = false;
        } catch (err) { showToast('Artifact non disponibile', err.message); }
      },
    });
  }

  // ----------------------------------------------------------------- boot
  function wireStatic() {
    const body = document.body;
    const mobileMenu = $('[data-mobile-menu]');
    const overlay = $('.mobile-overlay');
    if (mobileMenu) mobileMenu.addEventListener('click', () => body.classList.toggle('menu-open'));
    if (overlay) overlay.addEventListener('click', () => body.classList.remove('menu-open'));

    const form = $('[data-render="profile-form"]');
    if (form) {
      form.addEventListener('submit', (ev) => { ev.preventDefault(); saveProfile(form); });
      const reset = $('[data-action="reset-run"]');
      if (reset) reset.addEventListener('click', async () => {
        sessionStorage.removeItem(RUN_KEY);
        await ensureRun();
        renderShell(); renderPage();
        showToast('Nuovo run avviato', 'Traccia agentica azzerata e persona sintetica ricaricata.');
      });
    }

    const focusButtons = $$('[data-focus]');
    focusButtons.forEach((button) => button.addEventListener('click', () => {
      focusButtons.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      $$('[data-metric]').forEach((c) => c.classList.toggle('diff-focus',
        button.dataset.focus !== 'all' && c.dataset.metric === button.dataset.focus));
      const label = $('[data-focus-label]');
      if (label) label.textContent = button.textContent.trim();
    }));

    const filter = $('#trace-filter');
    if (filter) filter.addEventListener('input', () => PAGES.trace(store.view.state, store.view));

    const close = $('#artifact-close');
    if (close) close.addEventListener('click', () => { $('#artifact-dialog').hidden = true; });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('#artifact-dialog')) $('#artifact-dialog').hidden = true;
    });

    const inject = $('[data-action="inject"]');
    if (inject) inject.addEventListener('click', () => act('POST', '/api/run/' + store.runId + '/inject-noncompliant', {},
      ['SafetyGuard intervenuto', 'La bozza non conforme è stata bloccata prima di raggiungere l’interfaccia.']));

    const outage = $('[data-action="outage"]');
    if (outage) outage.addEventListener('click', () => {
      if (!confirm('La simulazione disattiva temporaneamente MortgageCalculator e porta il run in ESCALATED. Procedere?')) return;
      act('POST', '/api/run/' + store.runId + '/simulate-outage', { component: 'MortgageCalculator' },
        ['Componente non disponibile', 'Il run è passato in ESCALATED senza produrre numeri sostitutivi.']);
    });

    const replay = $('[data-replay-trace]');
    if (replay) replay.addEventListener('click', () => {
      const events = $$('.trace-event');
      let index = 0;
      const tick = () => {
        if (index > 0 && events[index - 1]) events[index - 1].classList.remove('highlight');
        if (index < events.length) {
          events[index].classList.add('highlight');
          events[index].scrollIntoView({ block: 'nearest' });
          const comp = events[index].dataset.component;
          $$('.arch-node').forEach((n) => n.classList.toggle('active', n.dataset.component === comp));
          index += 1;
          window.setTimeout(tick, 260);
        }
      };
      tick();
    });
  }

  (async function boot() {
    wireStatic();
    try {
      store.meta = await api('GET', '/api/meta');
      await ensureRun();
      renderShell();
      renderPage();
    } catch (err) {
      const main = $('.page') || document.body;
      main.prepend(notice('warning',
        '<strong>Runtime non raggiungibile.</strong> Avvia il server con <code>npm start</code> dalla cartella <code>app/</code> e ricarica la pagina.<br>Dettaglio: ' + err.message));
    }
  })();
})();
