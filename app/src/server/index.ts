import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildRuntime } from '../runtime/buildRuntime.js';
import { ComponentNotFoundError, ComponentUnavailableError, IllegalTransitionError, ValidationError } from '../core/errors.js';
import { HUMAN_GATE_STATEMENT, LEGAL_TRANSITIONS } from '../core/stateMachine.js';
import { QUIZ_QUESTIONS } from '../data/quizBank.js';
import { GLOSSARY } from '../data/syntheticOffers.js';
import { ANDREA_DEMO_EXISTING_DEBTS } from '../data/syntheticPersona.js';
import { ROW_LABELS, ROW_ORDER } from '../skills/normalizeMortgageOffers.js';
import type { ScenarioId } from '../core/types.js';
import type { ProfilePatch } from '../orchestrator/mortgageJourneyOrchestrator.js';

const runtime = buildRuntime();
const PORT = Number(process.env['PORT'] ?? 5173);

const PUBLIC_DIR = join(fileURLToPath(new URL('../../../', import.meta.url)), 'public');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};

interface Route {
  method: string;
  pattern: RegExp;
  handler: (params: string[], body: unknown) => unknown;
}

const routes: Route[] = [
  {
    method: 'GET',
    pattern: /^\/api\/meta$/,
    handler: () => ({
      product: 'MutuoChiaro',
      tagline: 'Capisci l impatto. Decidi tu.',
      syntheticData: true,
      quiz: QUIZ_QUESTIONS.map((q) => ({
        id: q.id,
        concept: q.concept,
        prompt: q.prompt,
        options: q.options,
      })),
      glossary: GLOSSARY,
      rowOrder: ROW_ORDER,
      rowLabels: ROW_LABELS,
      humanGateStatement: HUMAN_GATE_STATEMENT,
      legalTransitions: LEGAL_TRANSITIONS,
      components: runtime.registry.list(),
      demoExistingDebts: ANDREA_DEMO_EXISTING_DEBTS,
      scenarioIds: ['BASE', 'APPRAISAL_MINUS_10', 'RATE_PLUS_2PP', 'INCOME_MINUS_20_6M'],
    }),
  },
  {
    method: 'POST',
    pattern: /^\/api\/run$/,
    handler: () => {
      const state = runtime.orchestrator.createRun();
      return withTrace(state.runId, runtime.orchestrator.view(state.runId));
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/run\/([\w-]+)$/,
    handler: (p) => withTrace(p[0]!, runtime.orchestrator.view(p[0]!)),
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/profile$/,
    handler: (p, body) =>
      withTrace(p[0]!, runtime.orchestrator.updateProfile(p[0]!, asProfilePatch(body))),
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/answer$/,
    handler: (p, body) => {
      const b = body as { field?: unknown; value?: unknown };
      if (typeof b.field !== 'string') {
        throw new ValidationError('Campo "field" obbligatorio.', [
          { field: 'field', code: 'MISSING', message: 'Indica il campo a cui stai rispondendo.' },
        ]);
      }
      const value = b.value === null || b.value === undefined ? null : Number(b.value);
      if (value !== null && !Number.isFinite(value)) {
        throw new ValidationError('Valore non numerico.', [
          { field: b.field, code: 'NOT_A_NUMBER', message: 'Inserisci un numero.' },
        ]);
      }
      return withTrace(p[0]!, runtime.orchestrator.answerDecisiveQuestion(p[0]!, b.field, value));
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/offers\/([\w-]+)$/,
    handler: (p, body) =>
      withTrace(p[0]!, runtime.orchestrator.editOffer(p[0]!, p[1]!, asOfferPatch(body))),
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/normalize$/,
    handler: (p) => withTrace(p[0]!, runtime.orchestrator.normalizeOffers(p[0]!)),
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/scenarios$/,
    handler: (p, body) => {
      const b = body as { scenarioIds?: unknown };
      const ids = Array.isArray(b.scenarioIds) ? (b.scenarioIds as ScenarioId[]) : undefined;
      return withTrace(
        p[0]!,
        ids ? runtime.orchestrator.runScenarios(p[0]!, ids) : runtime.orchestrator.runScenarios(p[0]!),
      );
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/understanding\/start$/,
    handler: (p) => withTrace(p[0]!, runtime.orchestrator.startUnderstandingCheck(p[0]!)),
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/understanding$/,
    handler: (p, body) => {
      const b = body as { answers?: unknown };
      if (typeof b.answers !== 'object' || b.answers === null) {
        throw new ValidationError('Campo "answers" obbligatorio.', [
          { field: 'answers', code: 'MISSING', message: 'Rispondi a tutte le domande.' },
        ]);
      }
      return withTrace(
        p[0]!,
        runtime.orchestrator.submitQuiz(p[0]!, b.answers as Record<string, string>),
      );
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/approve$/,
    handler: (p, body) => {
      const b = body as { confirmed?: unknown; actor?: unknown };
      return withTrace(
        p[0]!,
        runtime.orchestrator.confirmHumanApproval(
          p[0]!,
          b.confirmed === true,
          typeof b.actor === 'string' && b.actor.length > 0 ? b.actor : 'utente-demo',
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/inject-noncompliant$/,
    handler: (p, body) => {
      const b = body as { draft?: unknown };
      const draft =
        typeof b.draft === 'string' && b.draft.trim().length > 0
          ? b.draft
          : 'Questo è il mutuo migliore per te: ti consigliamo di scegliere questa banca, hai il 90% di probabilità di approvazione.';
      return withTrace(p[0]!, runtime.orchestrator.injectNonCompliantDraft(p[0]!, draft));
    },
  },
  {
    method: 'POST',
    pattern: /^\/api\/run\/([\w-]+)\/simulate-outage$/,
    handler: (p, body) => {
      const b = body as { component?: unknown };
      const component = typeof b.component === 'string' ? b.component : 'MortgageCalculator';
      return withTrace(p[0]!, runtime.orchestrator.simulateComponentOutage(p[0]!, component));
    },
  },
  {
    method: 'GET',
    pattern: /^\/api\/run\/([\w-]+)\/events$/,
    handler: (p) => ({ events: runtime.events.byRun(p[0]!) }),
  },
  {
    method: 'GET',
    pattern: /^\/api\/run\/([\w-]+)\/artifacts$/,
    handler: (p) => ({
      artifacts: runtime.artifacts
        .listByRun(p[0]!)
        .map(({ ref, component, direction, ts }) => ({ ref, component, direction, ts })),
    }),
  },
  {
    method: 'GET',
    pattern: /^\/api\/artifact\/(.+)$/,
    handler: (p) => {
      const artifact = runtime.artifacts.get(decodeURIComponent(p[0]!));
      if (!artifact) throw new ValidationError('Artifact inesistente.', []);
      return artifact;
    },
  },
];

function withTrace(runId: string, view: unknown): unknown {
  return {
    ...(view as Record<string, unknown>),
    events: runtime.events.byRun(runId),
    invocationCounts: Object.fromEntries(
      runtime.registry.list().map((c) => [c.name, runtime.registry.callCount(c.name)]),
    ),
  };
}

function asProfilePatch(body: unknown): ProfilePatch {
  const allowed: (keyof ProfilePatch)[] = [
    'monthlyNetIncome',
    'otherMonthlyIncome',
    'existingMonthlyDebts',
    'savings',
    'emergencyFundMin',
    'price',
    'accessoryCosts',
    'plannedWorks',
    'requestedLoanAmount',
    'assumedYears',
  ];
  const src = (body ?? {}) as Record<string, unknown>;
  const patch: ProfilePatch = {};
  for (const key of allowed) {
    if (!(key in src)) continue;
    const raw = src[key];
    if (raw === null || raw === '') {
      patch[key] = null;
      continue;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      throw new ValidationError(`Valore non numerico per ${key}.`, [
        { field: key, code: 'NOT_A_NUMBER', message: 'Inserisci un numero valido.' },
      ]);
    }
    patch[key] = num;
  }
  return patch;
}

function asOfferPatch(body: unknown): Record<string, unknown> {
  const allowed = [
    'displayName',
    'amount',
    'years',
    'rateType',
    'tanPct',
    'declaredTaegPct',
    'declaredInitialPayment',
    'arrangementFee',
    'appraisalFee',
    'otherUpfrontCosts',
    'insuranceRequired',
    'insuranceCost',
    'recurringMonthlyCost',
    'maxLtvPct',
  ];
  const src = (body ?? {}) as Record<string, unknown>;
  const patch: Record<string, unknown> = {};
  for (const key of allowed) {
    if (!(key in src)) continue;
    const raw = src[key];
    if (raw === null || raw === '') {
      patch[key] = null;
      continue;
    }
    if (key === 'displayName' || key === 'rateType') {
      patch[key] = String(raw);
      continue;
    }
    if (key === 'insuranceRequired') {
      patch[key] = raw === true || raw === 'true';
      continue;
    }
    const num = Number(raw);
    if (!Number.isFinite(num)) {
      throw new ValidationError(`Valore non numerico per ${key}.`, [
        { field: key, code: 'NOT_A_NUMBER', message: 'Inserisci un numero valido.' },
      ]);
    }
    patch[key] = num;
  }
  return patch;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  if (raw.trim().length === 0) return {};
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ValidationError('Corpo della richiesta non è JSON valido.', []);
  }
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
    'cache-control': 'no-store',
  });
  res.end(body);
}

async function serveStatic(res: ServerResponse, urlPath: string): Promise<void> {
  let rel = urlPath === '/' ? 'index.html' : normalize(urlPath).replace(/^([/\\])+/, '');
  if (rel.includes('..')) {
    sendJson(res, 400, { error: 'Percorso non consentito.' });
    return;
  }
  // Percorsi senza estensione: /profilo -> profilo.html
  if (!extname(rel)) rel += '.html';
  try {
    const file = await readFile(join(PUBLIC_DIR, rel));
    res.writeHead(200, {
      'content-type': MIME[extname(rel)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(file);
  } catch {
    sendJson(res, 404, { error: 'Risorsa non trovata.' });
  }
}

export const server = createServer((req, res) => {
  void (async () => {
    const method = req.method ?? 'GET';
    const urlPath = new URL(req.url ?? '/', `http://localhost:${PORT}`).pathname;

    if (!urlPath.startsWith('/api/')) {
      await serveStatic(res, urlPath);
      return;
    }

    const route = routes.find((r) => r.method === method && r.pattern.test(urlPath));
    if (!route) {
      sendJson(res, 404, { error: `Endpoint non gestito: ${method} ${urlPath}` });
      return;
    }

    try {
      const params = urlPath.match(route.pattern)!.slice(1);
      const body = method === 'GET' ? {} : await readBody(req);
      sendJson(res, 200, route.handler(params, body));
    } catch (error) {
      if (error instanceof ValidationError) {
        sendJson(res, 422, {
          error: error.message,
          code: 'VALIDATION_ERROR',
          issues: error.issues,
        });
        return;
      }
      if (error instanceof IllegalTransitionError) {
        sendJson(res, 409, {
          error: error.message,
          code: 'ILLEGAL_TRANSITION',
          from: error.from,
          to: error.to,
        });
        return;
      }
      if (error instanceof ComponentNotFoundError || error instanceof ComponentUnavailableError) {
        sendJson(res, 503, { error: error.message, code: 'COMPONENT_UNAVAILABLE' });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      sendJson(res, 500, { error: message, code: 'INTERNAL_ERROR' });
    }
  })();
});

if (process.env['MUTUOCHIARO_NO_LISTEN'] !== '1') {
  server.listen(PORT, () => {
    process.stdout.write(`MutuoChiaro in ascolto su http://localhost:${PORT}\n`);
    process.stdout.write('Dati e offerte sintetici, uso esclusivamente educativo.\n');
  });
}
