// MutuoChiaro - client della demo. Nessun calcolo finanziario qui:
// tutti i numeri arrivano dai tool deterministici del runtime.

const EUR = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 });
const EUR0 = new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 });

const PROV_BADGE = {
  USER_INPUT: ['badge-user', 'dato inserito'],
  SYNTHETIC_OFFER: ['badge-offer', 'dato offerta'],
  CALCULATED: ['badge-calc', 'calcolo'],
  SCENARIO_ASSUMPTION: ['badge-assumption', 'ipotesi'],
  MISSING: ['badge-missing', 'mancante'],
};

const PHASE_STEPS = [
  ['START', 'Avvio'],
  ['PROFILE_INCOMPLETE', 'Profilo'],
  ['PROFILE_READY', 'Profilo completo'],
  ['OFFERS_INCOMPLETE', 'Offerte'],
  ['OFFERS_NORMALIZED', 'MutuoSpecchio'],
  ['SCENARIOS_READY', 'Scenari'],
  ['UNDERSTANDING_CHECK', 'Comprensione'],
  ['AWAITING_HUMAN_CONFIRMATION', 'Conferma'],
  ['COMPLETED', 'Chiusura'],
];

const EUR_ROWS = new Set(['rataIniziale', 'costoTotaleSimulato', 'interessiTotaliSimulati', 'costiIniziali', 'liquiditaResidua', 'margineMensile']);
const PCT_ROWS = new Set(['tan', 'taegDichiarato', 'rapportoRataReddito']);

let meta = null;
let runId = null;
let view = null;
let activeScenario = 'BASE';

const $ = (sel) => document.querySelector(sel);
const el = (tag, props = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) if (child) node.append(child);
  return node;
};

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Errore ${res.status}`);
    err.payload = data;
    throw err;
  }
  return data;
}

function fmtTraced(rowKey, traced) {
  if (!traced || traced.value === null || traced.value === undefined) {
    return traced?.note ?? '—';
  }
  if (EUR_ROWS.has(rowKey)) {
    return rowKey === 'rataIniziale' || rowKey === 'margineMensile'
      ? EUR.format(traced.value)
      : EUR0.format(traced.value);
  }
  if (PCT_ROWS.has(rowKey)) return `${NUM.format(traced.value)}%`;
  if (rowKey === 'durataAnni') return `${traced.value} anni`;
  return NUM.format(traced.value);
}

function badge(provenance) {
  const [cls, label] = PROV_BADGE[provenance] ?? ['badge-missing', 'mancante'];
  return el('span', { class: `badge ${cls}`, text: label });
}

function tooltipFor(label) {
  const key = Object.keys(meta?.glossary ?? {}).find(
    (k) => k.toLowerCase() === label.toLowerCase() || label.toLowerCase().includes(k.toLowerCase()),
  );
  if (!key) return el('span', { text: label });
  return el('span', { class: 'tooltip', title: meta.glossary[key], tabindex: '0' }, [
    document.createTextNode(label),
  ]);
}

// ---------------------------------------------------------------- render

function render() {
  if (!view) return;
  const s = view.state;
  $('#phase-chip').textContent = `Fase: ${s.currentPhase}`;
  $('#next-action').textContent = view.nextAction ?? '';

  renderStepper(s.currentPhase);
  renderRawOffers(s.offers);
  $('#before-answer').textContent = `«${s.before.answer}»`;

  // Il profilo e sempre accessibile: e il punto di ingresso del percorso.
  show('#sec-profile', true);
  fillProfileForm(s);
  renderProfileSummary();

  renderQuestion(s);
  renderMirror(s);
  renderScenarios(s);
  renderQuiz(s);
  renderGate(s);
  renderBeforeAfter();
  renderTrace(view.events ?? [], view.invocationCounts ?? {});
  renderWarnings(s.warnings);
}

function show(sel, visible) {
  $(sel).classList.toggle('hidden', !visible);
}

function renderStepper(phase) {
  const list = $('#stepper-list');
  list.replaceChildren();
  const currentIndex = PHASE_STEPS.findIndex(([p]) => p === phase);
  PHASE_STEPS.forEach(([p, label], i) => {
    let state = 'todo';
    if (phase === 'ESCALATED') state = i === 0 ? 'current' : 'todo';
    else if (i < currentIndex) state = 'done';
    else if (i === currentIndex) state = 'current';
    list.append(el('li', { 'data-state': state, text: label }));
  });
  if (phase === 'ESCALATED') {
    list.append(el('li', { 'data-state': 'current', text: 'Escalation' }));
  }
}

function renderRawOffers(offers) {
  const box = $('#raw-offers');
  box.replaceChildren();
  for (const o of offers) {
    const dl = el('dl');
    const rows = [
      ['Importo', o.amount === null ? 'n.d.' : EUR0.format(o.amount)],
      ['Durata', o.years === null ? 'n.d.' : `${o.years} anni`],
      ['Tasso', o.rateType === 'FIXED' ? 'fisso' : o.rateType === 'VARIABLE' ? 'variabile' : 'n.d.'],
      ['TAN', o.tanPct === null ? 'n.d.' : `${NUM.format(o.tanPct)}%`],
      ['TAEG', o.declaredTaegPct === null ? 'n.d.' : `${NUM.format(o.declaredTaegPct)}%`],
      ['Rata dichiarata', o.declaredInitialPayment === null ? 'n.d.' : EUR.format(o.declaredInitialPayment)],
      ['Istruttoria', o.arrangementFee === null ? 'n.d.' : EUR0.format(o.arrangementFee)],
      ['Perizia', o.appraisalFee === null ? 'n.d.' : EUR0.format(o.appraisalFee)],
      ['Polizza obbligatoria', o.insuranceRequired === true ? 'sì' : o.insuranceRequired === false ? 'no' : 'n.d.'],
      ['Costo polizza', o.insuranceCost === null ? 'non indicato' : EUR0.format(o.insuranceCost)],
    ];
    for (const [k, v] of rows) {
      dl.append(el('dt', { text: k }), el('dd', { text: v }));
    }
    box.append(
      el('article', { class: 'raw-offer' }, [
        el('h3', { text: o.displayName }),
        dl,
        o.notes ? el('p', { class: 'muted small', text: o.notes }) : null,
      ]),
    );
  }
}

function fillProfileForm(s) {
  const form = $('#profile-form');
  if (form.dataset.dirty === '1') return;
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
  for (const [name, value] of Object.entries(values)) {
    const input = form.elements[name];
    if (input) input.value = value === null || value === undefined ? '' : value;
  }
}

function renderProfileSummary() {
  const box = $('#profile-summary');
  box.replaceChildren();
  const pa = view.profileAgent;
  if (!pa) return;
  const ul = el('ul');
  for (const line of pa.summaryForUser) ul.append(el('li', { text: line }));
  box.append(
    el('p', { class: 'muted', html: `<strong>Profile &amp; Property Agent</strong> — confidenza dichiarata: ${NUM.format(view.state.confidence)}` }),
    ul,
  );
  if (pa.derived.loanToPricePct !== null) {
    box.append(
      el('p', { class: 'small' }, [
        tooltipFor('Rapporto prestito/valore'),
        document.createTextNode(` sul prezzo: ${NUM.format(pa.derived.loanToPricePct)}% `),
        badge('CALCULATED'),
      ]),
    );
  }
}

function renderQuestion(s) {
  const visible = Boolean(s.selectedQuestion);
  show('#sec-question', visible);
  if (!visible) return;
  const q = s.selectedQuestion;
  $('#question-text').textContent = q.question;
  $('#question-why').textContent = q.why;
  $('#question-rationale').textContent = view.profileAgent?.questionRationale ?? '';
  $('#question-label').firstChild.textContent = `Risposta${q.unit ? ` (${q.unit})` : ''} `;
  $('#question-input').value = '';
  $('#question-input').dataset.field = q.field;
  const list = $('#question-candidates');
  list.replaceChildren();
  for (const c of view.profileAgent?.candidates ?? []) {
    list.append(el('li', { text: `impatto ${c.decisionImpact} — ${c.field}: ${c.reason}` }));
  }
}

function renderMirror(s) {
  const visible = s.normalizedOffers.length > 0;
  show('#sec-mirror', visible);
  if (!visible) return;

  const table = $('#mirror-table');
  table.replaceChildren(table.querySelector('caption'));
  const thead = el('thead');
  const headRow = el('tr', {}, [el('th', { scope: 'col', text: 'Voce' })]);
  for (const offer of s.normalizedOffers) {
    headRow.append(
      el('th', { scope: 'col', class: 'offer-head' }, [
        document.createTextNode(offer.displayName),
        offer.partial ? el('span', { class: 'partial-flag', text: 'confronto parziale' }) : null,
      ]),
    );
  }
  thead.append(headRow);
  table.append(thead);

  const tbody = el('tbody');
  for (const rowKey of meta.rowOrder) {
    const tr = el('tr', {}, [el('th', { scope: 'row' }, [tooltipFor(meta.rowLabels[rowKey] ?? rowKey)])]);
    for (const offer of s.normalizedOffers) {
      const traced = offer.rows[rowKey];
      const td = el('td', {}, [
        el('span', { class: 'cell-value', text: fmtTraced(rowKey, traced) }),
        badge(traced?.provenance ?? 'MISSING'),
      ]);
      if (traced?.note && traced.value !== null) {
        td.append(el('span', { class: 'cell-note', text: traced.note }));
      }
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);

  // note dell Offer Clarity Agent
  const notes = $('#mirror-notes');
  notes.replaceChildren();
  const clarity = view.clarity;
  if (clarity) {
    for (const per of clarity.perOffer) {
      const offer = s.normalizedOffers.find((o) => o.offerId === per.offerId);
      if (!offer || per.lines.length === 0) continue;
      const ul = el('ul');
      for (const line of per.lines) ul.append(el('li', { text: line }));
      notes.append(el('h3', { text: offer.displayName }), ul);
    }
    if (clarity.crossOffer.length > 0) {
      const ul = el('ul');
      for (const line of clarity.crossOffer) ul.append(el('li', { text: line }));
      notes.append(el('h3', { text: 'Osservazioni trasversali' }), ul);
    }
    if (clarity.missingDataNotes.length > 0) {
      const ul = el('ul');
      for (const line of clarity.missingDataNotes) ul.append(el('li', { text: line }));
      notes.append(el('h3', { text: 'Dati mancanti e domande da porre alla banca' }), ul);
    }
    const ulD = el('ul');
    for (const d of clarity.disclaimers) ulD.append(el('li', { text: d }));
    notes.append(el('h3', { text: 'Limiti dichiarati' }), ulD);
  }

  const select = $('#offer-select');
  if (select.options.length !== s.offers.length) {
    select.replaceChildren();
    for (const o of s.offers) select.append(el('option', { value: o.id, text: o.displayName }));
  }
}

function renderScenarios(s) {
  show('#sec-scenarios', s.normalizedOffers.length > 0);
  const tabs = $('#scenario-tabs');
  tabs.replaceChildren();
  for (const sc of s.scenarios) {
    tabs.append(
      el('button', {
        type: 'button',
        role: 'tab',
        'aria-selected': String(sc.scenarioId === activeScenario),
        text: sc.label,
        onclick: () => {
          activeScenario = sc.scenarioId;
          render();
        },
      }),
    );
  }

  const panel = $('#scenario-panel');
  panel.replaceChildren();
  const scenario = s.scenarios.find((sc) => sc.scenarioId === activeScenario) ?? s.scenarios[0];
  if (!scenario) return;

  panel.append(el('h3', { text: scenario.label }));

  if (scenario.assumptions.length > 0) {
    const ul = el('ul');
    for (const a of scenario.assumptions) ul.append(el('li', { text: a }));
    panel.append(el('div', { class: 'assumptions' }, [el('strong', { text: 'Ipotesi dello scenario' }), ul]));
  }

  const rows = [
    ['monthlyPayment', 'Rata mensile'],
    ['paymentToIncomePct', 'Rapporto rata/reddito'],
    ['monthlyMargin', 'Margine mensile'],
    ['liquidityNeeded', 'Liquidità iniziale necessaria'],
    ['liquidityRemaining', 'Liquidità residua'],
    ['totalCostSimulated', 'Costo totale simulato'],
    ['totalInterestSimulated', 'Interessi totali simulati'],
  ];
  const table = el('table', { class: 'mirror' });
  const thead = el('thead');
  const hr = el('tr', {}, [el('th', { scope: 'col', text: 'Voce' })]);
  for (const o of scenario.offers) hr.append(el('th', { scope: 'col', text: o.displayName }));
  thead.append(hr);
  const tbody = el('tbody');
  for (const [key, label] of rows) {
    const tr = el('tr', {}, [el('th', { scope: 'row' }, [tooltipFor(label)])]);
    for (const o of scenario.offers) {
      const traced = o[key];
      const fmtKey = key === 'paymentToIncomePct' ? 'rapportoRataReddito' : key === 'monthlyPayment' ? 'rataIniziale' : 'costoTotaleSimulato';
      const td = el('td', {}, [
        el('span', { class: 'cell-value', text: traced.value === null ? (traced.note ?? '—') : fmtTraced(fmtKey, traced) }),
        badge(traced.provenance),
      ]);
      if (traced.note && traced.value !== null) td.append(el('span', { class: 'cell-note', text: traced.note }));
      tr.append(td);
    }
    tbody.append(tr);
  }
  const trBreach = el('tr', {}, [el('th', { scope: 'row' }, [tooltipFor('Fondo di emergenza')])]);
  for (const o of scenario.offers) {
    trBreach.append(
      el('td', {}, [
        o.emergencyFundBreach === null
          ? el('span', { class: 'cell-value', text: '—' })
          : el('span', {
              class: o.emergencyFundBreach ? 'cell-value breach' : 'cell-value',
              text: o.emergencyFundBreach
                ? 'la liquidità residua scende sotto la soglia impostata'
                : 'la liquidità residua resta sopra la soglia impostata',
            }),
      ]),
    );
  }
  tbody.append(trBreach);
  table.append(thead, tbody);
  panel.append(el('div', { class: 'table-scroll' }, [table]));

  if (scenario.warnings.length > 0) {
    const ul = el('ul');
    for (const w of scenario.warnings) ul.append(el('li', { text: w }));
    panel.append(el('div', { class: 'warnings' }, [el('strong', { text: 'Avvertenze e limiti' }), ul]));
  }

  const note = view.clarity?.scenarioNotes.find((n) => n.startsWith(scenario.label));
  if (note) panel.append(el('p', { class: 'muted', text: note }));

  if (s.currentPhase === 'SCENARIOS_READY') {
    panel.append(
      el('button', {
        class: 'primary',
        type: 'button',
        text: 'Vai al controllo di comprensione',
        onclick: () => act('POST', `/api/run/${runId}/understanding/start`),
      }),
    );
  }
}

function renderQuiz(s) {
  const visible = ['UNDERSTANDING_CHECK', 'AWAITING_HUMAN_CONFIRMATION', 'COMPLETED'].includes(s.currentPhase);
  show('#sec-quiz', visible);
  if (!visible) return;

  const result = s.comprehensionResult;
  const statusText = {
    NOT_STARTED: 'Controllo non ancora svolto.',
    IN_PROGRESS: `Tentativo ${result.attemptsUsed} di ${result.maxAttempts} non superato. Puoi riprovare.`,
    PASSED: `Controllo superato al tentativo ${result.attemptsUsed} di ${result.maxAttempts}.`,
    NOT_VERIFIED: `Comprensione non verificata dopo ${result.attemptsUsed} tentativi su ${result.maxAttempts}. I risultati restano consultabili.`,
  }[result.status];
  $('#quiz-status').textContent = statusText;

  const form = $('#quiz-form');
  const canAnswer = s.currentPhase === 'UNDERSTANDING_CHECK' && result.attemptsUsed < result.maxAttempts;
  form.replaceChildren();
  if (canAnswer) {
    for (const q of meta.quiz) {
      const fs = el('fieldset', { class: 'quiz-q' }, [el('legend', { text: q.prompt })]);
      for (const opt of q.options) {
        fs.append(
          el('label', {}, [
            el('input', { type: 'radio', name: q.id, value: opt.id, required: 'required' }),
            el('span', { text: opt.text }),
          ]),
        );
      }
      form.append(fs);
    }
    form.append(el('button', { type: 'submit', class: 'primary', text: 'Verifica le risposte' }));
  }

  const fb = $('#quiz-feedback');
  fb.replaceChildren();
  if (result.conceptsUnderstood.length > 0) {
    fb.append(
      el('p', { class: 'muted', text: `Concetti verificati: ${result.conceptsUnderstood.join(', ')}.` }),
    );
  }
  for (const f of result.feedback) {
    fb.append(
      el('div', { class: 'feedback-item' }, [
        el('h4', { text: `Concetto da rivedere: ${f.concept}` }),
        el('p', { text: f.explanation }),
        el('button', {
          type: 'button',
          text: `Riapri lo scenario collegato`,
          onclick: () => {
            activeScenario = f.reopenScenario;
            render();
            $('#sec-scenarios').scrollIntoView({ behavior: 'smooth', block: 'start' });
          },
        }),
      ]),
    );
  }
}

function renderGate(s) {
  const visible = ['AWAITING_HUMAN_CONFIRMATION', 'COMPLETED'].includes(s.currentPhase);
  show('#sec-gate', visible);
  if (!visible) return;
  $('#gate-statement').textContent = view.humanGateStatement;
  const blockers = view.completionBlockers ?? [];
  $('#gate-blockers').textContent =
    blockers.length > 0 ? `Requisiti ancora aperti: ${blockers.join(' ')}` : '';
  const done = s.currentPhase === 'COMPLETED';
  $('#gate-check').checked = done || $('#gate-check').checked;
  $('#gate-check').disabled = done;
  $('#btn-approve').disabled = done || !$('#gate-check').checked;
  $('#btn-approve').textContent = done ? 'Sessione chiusa' : 'Confermo e chiudo la sessione';
}

function renderBeforeAfter() {
  const m = view.metrics;
  const visible = Boolean(m) && view.state.normalizedOffers.length > 0;
  show('#sec-after', visible);
  if (!visible) return;
  const box = $('#before-after');
  box.replaceChildren();

  const col = (title, rows) => {
    const dl = el('dl');
    for (const [k, v] of rows) dl.append(el('dt', { text: k }), el('dd', { text: v }));
    return el('div', { class: 'ba-col' }, [el('h3', { text: title }), dl]);
  };
  const yn = (b) => (b ? 'sì' : 'no');

  box.append(
    col('Prima', [
      ['Criteri di confronto usati', m.beforeAfter.before.comparisonCriteriaUsed.join(', ') || '—'],
      ['Numero di criteri', String(m.beforeAfter.before.criteriaCount)],
      ['Termini spiegati', String(m.beforeAfter.before.termsExplained)],
      ['Dati mancanti noti all utente', String(m.beforeAfter.before.missingDataKnownToUser)],
      ['Sa spiegare rata vs costo totale', yn(m.beforeAfter.before.canExplainPaymentVsTotalCost)],
      ['Sa spiegare l effetto della perizia', yn(m.beforeAfter.before.canExplainAppraisalEffect)],
      ['Riconosce il rischio del variabile', yn(m.beforeAfter.before.canRecognizeVariableRateRisk)],
    ]),
    col('Dopo', [
      ['Criteri di confronto disponibili', String(m.beforeAfter.after.criteriaCount)],
      ['Termini spiegati', String(m.beforeAfter.after.termsExplained)],
      ['Dati mancanti individuati', String(m.beforeAfter.after.missingDataKnownToUser)],
      ['Sa spiegare rata vs costo totale', yn(m.beforeAfter.after.canExplainPaymentVsTotalCost)],
      ['Sa spiegare l effetto della perizia', yn(m.beforeAfter.after.canExplainAppraisalEffect)],
      ['Riconosce il rischio del variabile', yn(m.beforeAfter.after.canRecognizeVariableRateRisk)],
    ]),
    col('Metriche del run', [
      ['Concetti verificati', `${m.conceptsUnderstoodCount} su ${meta.quiz.length}`],
      ['Errori al primo tentativo', String(m.initialWrongAnswers)],
      ['Tentativi quiz usati', `${m.quizAttemptsUsed} su ${m.quizMaxAttempts}`],
      ['Dati mancanti rilevati (eventi)', String(m.missingDataDetected)],
      ['Dati mancanti risolti', `${m.missingDataResolved}${m.resolvedFields.length ? ` (${m.resolvedFields.join(', ')})` : ''}`],
      ['Domande decisive risolte', String(m.decisiveQuestionsAnswered)],
      ['Scenari completati', String(m.scenariosCompleted)],
      ['Offerte in confronto parziale', String(m.partialOffers)],
      ['Blocchi SafetyGuard', String(m.safetyGuardBlocks)],
      ['Invocazioni tool / skill / agent', `${m.toolInvocations} / ${m.skillInvocations} / ${m.agentInvocations}`],
      ['Tempo di completamento', m.completionTimeMs === null ? 'run non concluso' : `${NUM.format(m.completionTimeMs / 1000)} s`],
    ]),
  );
}

function renderTrace(events, counts) {
  const filter = $('#trace-filter').value.trim().toLowerCase();
  const tbody = $('#trace-table').querySelector('tbody');
  tbody.replaceChildren();
  const shown = events.filter(
    (e) => !filter || `${e.kind} ${e.actor} ${e.message}`.toLowerCase().includes(filter),
  );
  for (const e of shown) {
    tbody.append(
      el('tr', { 'data-status': e.status, 'data-kind': e.kind }, [
        el('td', { text: String(e.seq) }),
        el('td', { text: new Date(e.ts).toLocaleTimeString('it-IT', { hour12: false }) }),
        el('td', { text: e.actor }),
        el('td', {}, [el('span', { class: 'kind', text: e.kind }), el('span', { class: 'cell-note', text: e.message })]),
        el('td', { class: 'ref' }, [refButton(e.inputRef)]),
        el('td', { class: 'ref' }, [refButton(e.outputRef)]),
        el('td', { text: e.durationMs === undefined ? '—' : `${NUM.format(e.durationMs)} ms` }),
        el('td', { text: e.phaseAfter ?? '—' }),
      ]),
    );
  }
  $('#trace-count').textContent = `${shown.length} eventi su ${events.length}`;

  const box = $('#invocation-counts');
  box.replaceChildren();
  for (const [name, n] of Object.entries(counts)) {
    box.append(el('span', { text: `${name}: ${n}` }));
  }
}

function refButton(ref) {
  if (!ref) return document.createTextNode('—');
  return el('button', {
    type: 'button',
    text: ref.length > 22 ? `${ref.slice(0, 22)}…` : ref,
    title: `Apri ${ref}`,
    onclick: async () => {
      try {
        const artifact = await api('GET', `/api/artifact/${encodeURIComponent(ref)}`);
        $('#artifact-title').textContent = `${artifact.component} — ${artifact.direction} — ${ref}`;
        $('#artifact-body').textContent = JSON.stringify(artifact.payload, null, 2);
        $('#artifact-dialog').classList.remove('hidden');
        $('#artifact-body').focus();
      } catch (err) {
        alert(err.message);
      }
    },
  });
}

function renderWarnings(warnings) {
  const box = $('#run-warnings');
  box.replaceChildren();
  if (!warnings || warnings.length === 0) return;
  const ul = el('ul');
  for (const w of warnings) ul.append(el('li', { text: w }));
  box.append(el('strong', { text: 'Segnalazioni registrate in questo run' }), ul);
}

// --------------------------------------------------------------- azioni

async function act(method, path, body) {
  try {
    view = await api(method, path, body);
    runId = view.state.runId;
    render();
    return view;
  } catch (err) {
    const issues = err.payload?.issues ?? [];
    const detail = issues.map((i) => i.message).join(' ');
    alert(`${err.message}${detail ? `\n${detail}` : ''}`);
    if (runId) {
      view = await api('GET', `/api/run/${runId}`);
      render();
    }
    throw err;
  }
}

function wire() {
  $('#btn-start').addEventListener('click', async () => {
    await act('POST', '/api/run');
    $('#btn-start').textContent = 'Nuovo run';
    $('#profile-form').dataset.dirty = '0';
    $('#sec-profile').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('#profile-form').addEventListener('input', () => {
    $('#profile-form').dataset.dirty = '1';
  });

  $('#profile-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (!runId) return;
    const data = Object.fromEntries(new FormData(ev.target).entries());
    $('#profile-errors').textContent = '';
    const negative = Object.entries(data).filter(([, v]) => v !== '' && Number(v) < 0);
    if (negative.length > 0) {
      $('#profile-errors').textContent = 'Non sono ammessi importi negativi.';
      return;
    }
    $('#profile-form').dataset.dirty = '0';
    try {
      await act('POST', `/api/run/${runId}/profile`, data);
    } catch {
      $('#profile-errors').textContent = 'Correggi i valori segnalati e riprova.';
    }
  });

  $('#question-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const input = $('#question-input');
    await act('POST', `/api/run/${runId}/answer`, {
      field: input.dataset.field,
      value: input.value === '' ? 0 : Number(input.value),
    });
    $('#profile-form').dataset.dirty = '0';
  });

  $('#offer-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const offerId = $('#offer-select').value;
    const field = $('#offer-field').value;
    const raw = $('#offer-value').value;
    await act('POST', `/api/run/${runId}/offers/${offerId}`, { [field]: raw === '' ? null : raw });
  });

  $('#btn-scenarios').addEventListener('click', () => act('POST', `/api/run/${runId}/scenarios`, {}));

  $('#quiz-form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const answers = Object.fromEntries(new FormData(ev.target).entries());
    await act('POST', `/api/run/${runId}/understanding`, { answers });
  });

  $('#gate-check').addEventListener('change', () => {
    $('#btn-approve').disabled = !$('#gate-check').checked;
  });

  $('#btn-approve').addEventListener('click', () =>
    act('POST', `/api/run/${runId}/approve`, { confirmed: true, actor: 'utente-demo' }),
  );

  $('#btn-inject').addEventListener('click', () => {
    if (!runId) return;
    act('POST', `/api/run/${runId}/inject-noncompliant`, {});
  });

  $('#btn-outage').addEventListener('click', () => {
    if (!runId) return;
    if (!confirm('La simulazione disattiva temporaneamente MortgageCalculator e porta il run in ESCALATED. Procedere?')) return;
    act('POST', `/api/run/${runId}/simulate-outage`, { component: 'MortgageCalculator' });
  });

  $('#trace-filter').addEventListener('input', () => renderTrace(view?.events ?? [], view?.invocationCounts ?? {}));

  $('#artifact-close').addEventListener('click', () => $('#artifact-dialog').classList.add('hidden'));
  $('#artifact-dialog').addEventListener('click', (ev) => {
    if (ev.target.id === 'artifact-dialog') $('#artifact-dialog').classList.add('hidden');
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') $('#artifact-dialog').classList.add('hidden');
  });
}

(async function boot() {
  meta = await api('GET', '/api/meta');
  wire();
  const created = await api('POST', '/api/run');
  view = created;
  runId = created.state.runId;
  render();
})();
