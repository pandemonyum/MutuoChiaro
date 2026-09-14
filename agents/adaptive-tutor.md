# Adaptive Tutor

## Scopo

Spiegare evidenze gia' calcolate e verificare la comprensione con feedback mirato.
Il ruolo e' realizzato da [offer-clarity-agent](../app/src/agents/offerClarityAgent.ts)
e [assess-user-understanding](../app/src/skills/assessUserUnderstanding.ts), chiamati
dall'orchestratore. Non esiste un componente registrato chiamato `adaptive-tutor`.

## Non fare

Non ricalcolare, modificare o completare numeri; non scegliere un'offerta.
Non promettere esiti, mutare lo stato o autorizzare tentativi oltre il limite.
Non dichiarare verificato un concetto che il quiz non ha verificato.

## Input e contesto selettivo

Offerte normalizzate, validazioni, scenari, soglia del fondo di emergenza e feedback
del quiz, secondo il contratto dell'agente. La skill di verifica riceve solo risposte
e tentativi precedenti. Per sviluppo e revisione consultare un solo frammento da
[knowledge/index.md](knowledge/index.md), associato al dubbio corrente.

La knowledge e' documentale: a runtime domande, spiegazioni degli errori e associazioni
agli scenari provengono da [quizBank.ts](../app/src/data/quizBank.ts). Non dichiarare
un recupero automatico dei Markdown o una strategia generata da un modello.

## Procedura

1. `offer-clarity-agent` invoca `explain-mortgage-tradeoffs` sulle evidenze disponibili.
2. Tutti i suoi testi passano da `SafetyGuard`; solo i testi approvati arrivano alla UI.
3. `assess-user-understanding` confronta le risposte con il quiz e restituisce feedback
   per gli errori, concetti compresi e scenari da riaprire.
4. In caso di errore indicare lo scenario pertinente, senza inventare nuovi numeri.
5. L'orchestratore registra il tentativo e richiede spiegazioni aggiornate.
6. Rispettare `MAX_QUIZ_ATTEMPTS = 3`: al limite non superato registrare `NOT_VERIFIED`.
7. Sia `PASSED` sia `NOT_VERIFIED` richiedono il gate umano prima di `COMPLETED`.

## Output

Busta di chiarezza con note per offerta, trasversali, dati mancanti, scenari,
feedback e disclaimer; risultato della verifica con `reopenScenarios`, `attemptsLeft`
e `limitReached`. Solo l'orchestratore persiste questi risultati nello stato.

## Done

Le spiegazioni sono neutrali e riferite a evidenze; le risposte sono valutate e il
prossimo passo e' esplicito. Una simulazione resta educativa, non una previsione.

## Fallback

Evidenza assente: dichiarare il limite senza completarla. Testo non conforme:
riscrittura di `SafetyGuard` ed evento osservabile. Tentativi esauriti: mantenere
i dubbi e passare al gate, senza simulare una risposta corretta.