#!/usr/bin/env node
/**
 * Lint deterministico della wiki (parte eseguibile dell'operazione `lint`
 * descritta in wiki/SCHEMA.md).
 *
 * Controlla la contabilità: frontmatter, vocabolari, date, fonti citate,
 * collegamenti risolvibili, pagine orfane, allineamento con l'indice,
 * formato del log e copertura dei frammenti in agents/knowledge/.
 *
 * Non controlla il significato: contraddizioni, affermazioni superate e
 * lacune concettuali restano a carico dell'agente, dopo questo comando.
 *
 * Esce con codice 1 se almeno un controllo fallisce. Gli avvisi non bloccano.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const WIKI = join(ROOT, 'wiki');
const KNOWLEDGE = join(ROOT, 'agents', 'knowledge');

const TIPI = ['concetto', 'componente', 'decisione', 'fonte', 'sintesi'];
const STATI = ['verificato', 'da-verificare', 'obsoleto'];
const CAMPI = ['titolo', 'tipo', 'stato', 'aggiornato', 'fonti'];
const OPERAZIONI = ['ingest', 'query', 'lint', 'schema'];
const CARTELLA = {
  concetti: 'concetto',
  componenti: 'componente',
  decisioni: 'decisione',
  fonti: 'fonte',
  sintesi: 'sintesi',
};
/** File di servizio: non sono pagine e non portano frontmatter. */
const SERVIZIO = ['index.md', 'SCHEMA.md', 'log.md', 'domande-aperte.md', 'raw/README.md'];
/** Giorni oltre i quali una pagina viene segnalata come possibilmente ferma. */
const GIORNI_STALE = 180;

const checks = [];
const warnings = [];
const record = (name, problems) =>
  checks.push({ name, ok: problems.length === 0, detail: problems.join('; ') });
const warn = (message) => warnings.push(message);

const toPosix = (path) => path.split('\\').join('/');
const id = (absolute) => toPosix(relative(ROOT, absolute));

async function walk(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(path)));
    else if (entry.name.endsWith('.md')) found.push(path);
  }
  return found.sort();
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function unquote(value) {
  const trimmed = value.trim();
  return /^(['"]).*\1$/.test(trimmed) ? trimmed.slice(1, -1) : trimmed;
}

/** Parser minimo: copre chiave/valore e liste, quanto basta al formato dichiarato. */
function parseFrontmatter(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return { errore: 'frontmatter assente' };
  const close = lines.indexOf('---', 1);
  if (close === -1) return { errore: 'frontmatter non chiuso' };
  const data = {};
  let key = null;
  for (const line of lines.slice(1, close)) {
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    const item = /^\s*-\s+(.+)$/.exec(line);
    if (item) {
      if (!key) return { errore: `voce di lista senza chiave: ${line.trim()}` };
      if (!Array.isArray(data[key])) data[key] = [];
      data[key].push(unquote(item[1]));
      continue;
    }
    const pair = /^([A-Za-z_][\w-]*):\s*(.*)$/.exec(line);
    if (!pair) return { errore: `riga non interpretabile: ${line.trim()}` };
    key = pair[1];
    const value = pair[2].trim();
    data[key] = value === '' ? [] : unquote(value);
  }
  return { data };
}

function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10) === value ? date : null;
}

/** I link dentro un blocco o uno span di codice sono esempi, non collegamenti. */
function stripCode(text) {
  return text.replace(/^```[\s\S]*?^```/gm, '').replace(/`[^`\n]*`/g, '');
}

function localLinks(text) {
  const targets = [];
  for (const match of stripCode(text).matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|#)/i.test(target)) continue;
    const clean = decodeURIComponent(target.split('#')[0]);
    if (clean !== '') targets.push(clean);
  }
  return targets;
}

// --------------------------------------------------------------- raccolta
const pages = [];
const service = [];
for (const file of await walk(WIKI)) {
  const key = toPosix(relative(WIKI, file));
  const entry = { file, key, text: await readFile(file, 'utf8') };
  if (SERVIZIO.includes(key) || key.startsWith('raw/')) service.push(entry);
  else pages.push(entry);
}

const oggi = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);

// 1. Frontmatter presente, completo e interpretabile.
const rotti = [];
for (const page of pages) {
  const { data, errore } = parseFrontmatter(page.text);
  if (errore) {
    rotti.push(`${page.key}: ${errore}`);
    continue;
  }
  page.meta = data;
  const mancanti = CAMPI.filter((campo) => data[campo] === undefined || data[campo] === '');
  if (mancanti.length > 0) rotti.push(`${page.key}: campi mancanti (${mancanti.join(', ')})`);
}
record('frontmatter: presente e completo su ogni pagina', rotti);

const valide = pages.filter((page) => page.meta);

// 2. Vocabolari chiusi.
record(
  'frontmatter: tipo e stato appartengono ai vocabolari dichiarati',
  valide.flatMap((page) => {
    const problemi = [];
    if (!TIPI.includes(page.meta.tipo)) problemi.push(`${page.key}: tipo "${page.meta.tipo}"`);
    if (!STATI.includes(page.meta.stato)) problemi.push(`${page.key}: stato "${page.meta.stato}"`);
    return problemi;
  }),
);

// 3. La cartella corrisponde al tipo dichiarato.
record(
  'struttura: la cartella corrisponde al tipo dichiarato',
  valide
    .filter((page) => CARTELLA[page.key.split('/')[0]] !== page.meta.tipo)
    .map((page) => `${page.key}: tipo "${page.meta.tipo}"`),
);

// 4. Date valide, non future; segnalazione delle pagine ferme da troppo tempo.
record(
  'frontmatter: aggiornato è una data ISO valida e non futura',
  valide.flatMap((page) => {
    const date = isoDate(page.meta.aggiornato);
    if (!date) return [`${page.key}: "${page.meta.aggiornato}"`];
    if (date > oggi) return [`${page.key}: data futura ${page.meta.aggiornato}`];
    const giorni = Math.floor((oggi - date) / 86400000);
    if (giorni > GIORNI_STALE) warn(`${page.key}: ferma da ${giorni} giorni, rileggere le fonti`);
    return [];
  }),
);

// 5. Titolo H1 coerente con il frontmatter.
record(
  'pagina: il titolo H1 ripete il campo titolo',
  valide.flatMap((page) => {
    const corpo = page.text.split(/\r?\n---\r?\n/).slice(1).join('\n');
    const h1 = /^#\s+(.+)$/m.exec(corpo);
    if (!h1) return [`${page.key}: nessun titolo H1`];
    return h1[1].trim() === String(page.meta.titolo).trim()
      ? []
      : [`${page.key}: "${h1[1].trim()}" invece di "${page.meta.titolo}"`];
  }),
);

// 6. Ogni fonte citata esiste come percorso del repo, oppure è un URL.
const fonteProblemi = [];
for (const page of valide) {
  const fonti = Array.isArray(page.meta.fonti) ? page.meta.fonti : [page.meta.fonti];
  if (fonti.length === 0) fonteProblemi.push(`${page.key}: nessuna fonte citata`);
  for (const fonte of fonti) {
    if (/^https?:\/\//.test(fonte)) continue;
    if (!(await exists(join(ROOT, fonte)))) fonteProblemi.push(`${page.key} -> ${fonte}`);
  }
}
record('fonti: ogni percorso citato nel frontmatter esiste', fonteProblemi);

// 7. Ogni collegamento locale risolve; conteggio dei collegamenti entranti.
const linkProblemi = [];
const inbound = new Map(pages.map((page) => [page.key, 0]));
for (const page of [...pages, ...service]) {
  for (const target of localLinks(page.text)) {
    const path = resolve(dirname(page.file), target);
    if (!(await exists(path))) {
      linkProblemi.push(`${id(page.file)} -> ${target}`);
      continue;
    }
    const key = toPosix(relative(WIKI, path));
    // L'indice e il log catalogano: non contano come collegamento entrante.
    if (inbound.has(key) && page.key !== 'index.md' && page.key !== 'log.md') {
      inbound.set(key, inbound.get(key) + 1);
    }
  }
}
record('collegamenti: ogni link locale della wiki risolve', linkProblemi);

// 8. Nessuna pagina orfana.
record(
  'collegamenti: nessuna pagina orfana',
  [...inbound.entries()].filter(([, count]) => count === 0).map(([key]) => key),
);

// 9. Indice allineato: ogni pagina è catalogata con lo stato corrente.
const index = service.find((entry) => entry.key === 'index.md');
const righeIndice = index ? index.text.split(/\r?\n/) : [];
const indiceProblemi = index ? [] : ['index.md assente'];
for (const page of index ? valide : []) {
  const righe = righeIndice.filter((riga) =>
    localLinks(riga).some((target) => resolve(WIKI, target) === page.file),
  );
  if (righe.length === 0) indiceProblemi.push(`${page.key}: non catalogata`);
  else if (!righe.some((riga) => riga.includes(page.meta.stato)))
    indiceProblemi.push(`${page.key}: stato "${page.meta.stato}" non riportato nell'indice`);
}
record('indice: ogni pagina è catalogata con il proprio stato', indiceProblemi);

// 10. Log append-only: formato parsabile, operazioni note, ordine cronologico.
const log = service.find((entry) => entry.key === 'log.md');
const voci = log ? log.text.split(/\r?\n/).filter((riga) => riga.startsWith('## ')) : [];
const logProblemi = log ? [] : ['log.md assente'];
let precedente = null;
for (const voce of voci) {
  const match = /^## \[(\d{4}-\d{2}-\d{2})\] ([a-z]+) \| (.+)$/.exec(voce);
  if (!match) {
    logProblemi.push(`formato: ${voce.slice(0, 60)}`);
    continue;
  }
  const [, giorno, operazione] = match;
  const date = isoDate(giorno);
  if (!date) logProblemi.push(`data non valida: ${giorno}`);
  else if (date > oggi) logProblemi.push(`data futura: ${giorno}`);
  else if (precedente && date < precedente) logProblemi.push(`ordine non cronologico: ${giorno}`);
  else precedente = date;
  if (!OPERAZIONI.includes(operazione)) logProblemi.push(`operazione sconosciuta: ${operazione}`);
}
if (log && voci.length === 0) logProblemi.push('nessuna voce registrata');
record('log: formato, operazioni e ordine cronologico', logProblemi);

// 11. Ogni frammento operativo è collegato da esattamente una pagina della wiki.
const frammenti = (await readdir(KNOWLEDGE)).filter(
  (file) => file.endsWith('.md') && file !== 'index.md',
);
const copertura = [];
for (const frammento of frammenti) {
  const atteso = join(KNOWLEDGE, frammento);
  const citanti = valide.filter((page) =>
    localLinks(page.text).some((target) => resolve(dirname(page.file), target) === atteso),
  );
  if (citanti.length === 0) copertura.push(`${frammento}: nessuna pagina lo collega`);
  else if (citanti.length > 1)
    copertura.push(
      `${frammento}: collegato da ${citanti.length} pagine (${citanti.map((p) => p.key).join(', ')})`,
    );
}
record('non duplicazione: ogni frammento knowledge è collegato da una sola pagina', copertura);

// 12. Nessun importo della demo ricopiato nelle pagine.
record(
  'non duplicazione: nessun importo in euro ricopiato nelle pagine',
  valide
    .filter((page) => /(?:€\s?\d|\d[\d.]{2,}\s?(?:€|euro))/i.test(page.text))
    .map((page) => page.key),
);

// 13. Le pagine non verificate vanno rilette prima di essere citate come acquisite.
for (const page of valide.filter((entry) => entry.meta.stato !== 'verificato')) {
  warn(`${page.key}: stato "${page.meta.stato}", rileggere la fonte prima di citarla`);
}

// ----------------------------------------------------------------- report
let failed = 0;
for (const check of checks) {
  if (!check.ok) failed += 1;
  const mark = check.ok ? 'OK  ' : 'FAIL';
  process.stdout.write(`${mark} ${check.name}${check.detail ? ` -> ${check.detail}` : ''}\n`);
}
for (const message of warnings) process.stdout.write(`AVVISO ${message}\n`);
process.stdout.write(
  `\n${checks.length - failed}/${checks.length} controlli superati su ${pages.length} pagine` +
    `${warnings.length > 0 ? `, ${warnings.length} ${warnings.length === 1 ? "avviso" : "avvisi"}` : ''}\n`,
);
if (failed === 0) {
  process.stdout.write(
    'Restano a carico dell agente: contraddizioni, affermazioni superate, concetti senza\n' +
      'pagina, collegamenti mancanti, lacune colmabili. Procedura in wiki/SCHEMA.md.\n',
  );
}
process.exit(failed === 0 ? 0 : 1);
