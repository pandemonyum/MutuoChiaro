(function () {
  const body = document.body;
  const mobileMenu = document.querySelector('[data-mobile-menu]');
  const overlay = document.querySelector('.mobile-overlay');
  if (mobileMenu) mobileMenu.addEventListener('click', () => body.classList.toggle('menu-open'));
  if (overlay) overlay.addEventListener('click', () => body.classList.remove('menu-open'));

  const page = body.dataset.page;
  document.querySelectorAll('.side-link[data-page-link]').forEach((link) => {
    link.classList.toggle('active', link.dataset.pageLink === page);
  });

  window.showToast = function (title, message) {
    const toast = document.querySelector('.toast');
    if (!toast) return;
    toast.querySelector('strong').textContent = title;
    toast.querySelector('span').textContent = message;
    toast.classList.add('show');
    window.clearTimeout(window.__toastTimer);
    window.__toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3200);
  };

  document.querySelectorAll('[data-toast]').forEach((button) => {
    button.addEventListener('click', () => {
      showToast(button.dataset.toastTitle || 'Aggiornamento completato', button.dataset.toast || 'I dati sono stati salvati nel run corrente.');
    });
  });

  document.querySelectorAll('[data-answer-group]').forEach((group) => {
    group.querySelectorAll('.answer-btn').forEach((button) => {
      button.addEventListener('click', () => {
        group.querySelectorAll('.answer-btn').forEach((b) => b.classList.remove('selected'));
        button.classList.add('selected');
        const target = document.querySelector(group.dataset.target || '#question-result');
        if (target) {
          target.hidden = false;
          target.innerHTML = '<strong>Profilo aggiornato.</strong> L’impegno mensile verrà incluso nei prossimi calcoli.';
        }
        showToast('Dato acquisito', 'MutuoSpecchio ricalcolerà margine mensile e rapporto rata/reddito.');
      });
    });
  });

  const focusButtons = document.querySelectorAll('[data-focus]');
  focusButtons.forEach((button) => {
    button.addEventListener('click', () => {
      focusButtons.forEach((b) => b.classList.remove('active'));
      button.classList.add('active');
      document.querySelectorAll('[data-metric]').forEach((cell) => cell.classList.toggle('diff-focus', cell.dataset.metric === button.dataset.focus));
      const label = document.querySelector('[data-focus-label]');
      if (label) label.textContent = button.textContent.trim();
    });
  });

  const scenarioData = {
    base: {
      label: 'Scenario base',
      title: 'La situazione con i dati attuali',
      description: 'Reddito e tassi restano invariati. Le cifre mostrano l’impatto iniziale delle tre offerte sintetiche.',
      kpis: ['€ 1.046', '46,5%', '€ 48.000'],
      notes: ['rata offerta selezionata', 'rata / reddito dichiarato', 'liquidità residua stimata'],
      bars: [47, 62, 80],
      values: ['46,5%', '€ 1.204', '€ 48.000'],
      explainTitle: 'Cosa cambia?',
      explainText: 'Nessuna variazione: questo scenario è il riferimento per confrontare gli effetti delle ipotesi successive.'
    },
    appraisal: {
      label: 'Perizia −10%',
      title: 'La banca valuta la casa € 270.000',
      description: 'Con una perizia inferiore al prezzo, l’importo finanziabile può ridursi e la liquidità iniziale richiesta può aumentare.',
      kpis: ['€ 30.000', '€ 78.000', '€ 18.000'],
      notes: ['differenza prezzo / perizia', 'liquidità iniziale richiesta', 'sotto la riserva desiderata'],
      bars: [72, 83, 30],
      values: ['€ 78.000', '€ 22.000', '€ 18.000'],
      explainTitle: 'Perché conta la perizia?',
      explainText: 'La banca può calcolare il finanziamento sul valore più basso tra prezzo e perizia. La simulazione non rappresenta una delibera.'
    },
    rates: {
      label: 'Tasso +2 punti',
      title: 'L’offerta variabile reagisce all’aumento',
      description: 'Solo l’offerta a tasso variabile viene ricalcolata. Il dato della polizza resta mancante e non viene stimato.',
      kpis: ['€ 1.308', '+ € 244', '58,1%'],
      notes: ['nuova rata variabile', 'aumento mensile', 'rata / reddito dichiarato'],
      bars: [58, 43, 66],
      values: ['€ 1.308', '€ 942', '58,1%'],
      explainTitle: 'Assunzione dello scenario',
      explainText: 'La simulazione applica +2 punti percentuali al TAN dell’offerta variabile mantenendo invariati capitale residuo e durata residua.'
    },
    income: {
      label: 'Reddito −20%',
      title: 'Se il reddito scende per sei mesi',
      description: 'Il sistema misura il margine mensile e quanta riserva servirebbe per assorbire il periodo, senza formulare raccomandazioni.',
      kpis: ['€ 1.800', '58,1%', '€ 4.524'],
      notes: ['reddito mensile temporaneo', 'rata / reddito', 'assorbimento riserva in 6 mesi'],
      bars: [58, 31, 66],
      values: ['58,1%', '€ 596', '€ 43.476'],
      explainTitle: 'Periodo simulato',
      explainText: 'La riduzione del reddito dura sei mesi. Al termine il reddito torna al valore iniziale; imposte e altre variazioni non sono modellate.'
    }
  };

  const tabs = document.querySelectorAll('.scenario-tab[data-scenario]');
  const renderScenario = (key) => {
    const data = scenarioData[key];
    if (!data) return;
    const label = document.querySelector('[data-scenario-label]');
    const title = document.querySelector('[data-scenario-title]');
    const description = document.querySelector('[data-scenario-description]');
    if (label) label.textContent = data.label;
    if (title) title.textContent = data.title;
    if (description) description.textContent = data.description;
    document.querySelectorAll('[data-scenario-kpi]').forEach((el, i) => el.textContent = data.kpis[i]);
    document.querySelectorAll('[data-scenario-note]').forEach((el, i) => el.textContent = data.notes[i]);
    document.querySelectorAll('[data-bar]').forEach((el, i) => el.style.width = data.bars[i] + '%');
    document.querySelectorAll('[data-bar-value]').forEach((el, i) => el.textContent = data.values[i]);
    const explainTitle = document.querySelector('[data-explain-title]');
    const explainText = document.querySelector('[data-explain-text]');
    if (explainTitle) explainTitle.textContent = data.explainTitle;
    if (explainText) explainText.textContent = data.explainText;
  };
  tabs.forEach((tab) => tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    renderScenario(tab.dataset.scenario);
  }));

  document.querySelectorAll('.quiz-card').forEach((card) => {
    const options = card.querySelectorAll('.quiz-option');
    options.forEach((option) => option.addEventListener('click', () => {
      options.forEach((o) => o.classList.remove('selected'));
      option.classList.add('selected');
      const feedback = card.querySelector('.quiz-feedback');
      if (!feedback) return;
      const correct = option.dataset.correct === 'true';
      feedback.className = 'quiz-feedback show ' + (correct ? 'correct' : 'wrong');
      feedback.innerHTML = correct
        ? '<strong>Corretto.</strong> ' + (card.dataset.correctMessage || 'Hai interpretato correttamente il dato.')
        : '<strong>Riprova.</strong> ' + (card.dataset.wrongMessage || 'Rileggi il confronto e osserva la relazione tra le grandezze.');
      updateQuizProgress();
    }));
  });

  function updateQuizProgress() {
    const cards = [...document.querySelectorAll('.quiz-card')];
    if (!cards.length) return;
    const correct = cards.filter((card) => card.querySelector('.quiz-option.selected[data-correct="true"]')).length;
    const count = document.querySelector('[data-quiz-count]');
    const bar = document.querySelector('[data-quiz-progress]');
    if (count) count.textContent = correct + ' / ' + cards.length;
    if (bar) bar.style.width = (correct / cards.length * 100) + '%';
  }

  const gateCheck = document.querySelector('[data-gate-check]');
  const gateButton = document.querySelector('[data-gate-button]');
  if (gateCheck && gateButton) {
    gateCheck.addEventListener('change', () => gateButton.disabled = !gateCheck.checked);
    gateButton.addEventListener('click', () => {
      gateButton.textContent = 'Conferma registrata';
      gateButton.disabled = true;
      showToast('Human gate completato', 'La sessione può ora passare allo stato COMPLETED.');
    });
  }

  const replay = document.querySelector('[data-replay-trace]');
  if (replay) {
    replay.addEventListener('click', () => {
      const events = [...document.querySelectorAll('.trace-event')];
      events.forEach((event) => event.classList.remove('highlight'));
      let index = 0;
      const tick = () => {
        if (index > 0) events[index - 1].classList.remove('highlight');
        if (index < events.length) {
          events[index].classList.add('highlight');
          const component = events[index].dataset.component;
          document.querySelectorAll('.arch-node').forEach((n) => n.classList.toggle('active', n.dataset.component === component));
          index += 1;
          window.setTimeout(tick, 520);
        }
      };
      tick();
    });
  }
})();
