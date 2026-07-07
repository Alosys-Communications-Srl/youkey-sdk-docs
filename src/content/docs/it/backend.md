---
title: Integrazione backend
description: Installazione e configurazione di @alosys/youkey-server per la verifica lato server delle richieste attestate, firmate e cifrate.
---

## Scopo

L'SDK backend, `@alosys/youkey-server`, verifica nel tuo backend le richieste
attestate, firmate e cifrate. Emette i token di sessione per le istanze
dell'applicazione attestate, convalida la firma di ogni richiesta protetta e
decifra i corpi di richiesta cifrati. Sono forniti adapter per Express, Fastify
e Nest; il core funziona inoltre con qualsiasi server Node.js.

Se la tua applicazione usa solo le funzioni di trasporto mobile (pinning,
criteri TLS, blocco del traffico in chiaro, pin da remoto), l'SDK backend non è
necessario.

## Installazione

```sh
npm install @alosys/youkey-server
```

## Verifier

`YoukeyVerifier` espone `attest()` (lo scambio una-volta-per-sessione) e
`verifyRequest()` (il controllo per ogni richiesta). Storage e firma sono
sostituibili tramite interfacce; per lo sviluppo sono fornite implementazioni
in memoria.

```ts
import {
  YoukeyVerifier, LocalKeySigner,
  PlayIntegrityVerifier, AppAttestVerifier, EnrolledKeyVerifier,
} from "@alosys/youkey-server";

const verifier = new YoukeyVerifier({
  tokenSigner: new LocalKeySigner(),          // production: a KMS-backed KeySigner
  attestation: {
    android: playIntegrityVerifier,           // optional
    ios: appAttestVerifier,                   // optional
    enrolledKey: new EnrolledKeyVerifier(),   // optional (device-key enrollment)
  },
  clockSkewSeconds: 300,
  tokenTtlSeconds: 900,
});
```

## Collegamento delle route (Express)

```ts
import express from "express";
import { youkeyAttestHandler, youkeyMiddleware } from "@alosys/youkey-server/express";

const app = express();
// The request signature covers the raw body bytes; retain them.
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));

app.post("/attest", youkeyAttestHandler(verifier));
app.use("/api/sensitive", youkeyMiddleware(verifier, { policy: "enforce" }));
```

Gli adapter Fastify e Nest espongono handler equivalenti
(`@alosys/youkey-server/fastify`, `@alosys/youkey-server/nest`).

## Route di enrollment con chiave di dispositivo

Quando si usa l'enrollment con chiave di dispositivo, monta gli handler di
sfida (challenge) ed enrollment. Poni la route di enrollment dietro
l'autenticazione di sessione esistente e fornisci una funzione che estrae il
tuo identificativo del cliente dalla richiesta autenticata.

```ts
import { youkeyChallengeHandler, youkeyEnrollHandler } from "@alosys/youkey-server/express";

app.get("/challenge", youkeyChallengeHandler(verifier));
app.post("/enroll", bankSessionAuth, youkeyEnrollHandler(verifier, (req) => req.session.customerId));
```

## Decifratura del payload

`youkeyPayloadMiddleware` decifra il corpo della richiesta prima che venga
eseguito l'handler della route e cifra la risposta. Montalo prima del parser del
corpo JSON sulle route protette.

```ts
import { youkeyPayloadMiddleware } from "@alosys/youkey-server";

app.use("/api/sensitive", youkeyPayloadMiddleware({
  keys: { "enc-2026-a": { publicKeySpkiB64, privateScalar } },
  policy: "enforce",
}));
```

## Gestione delle chiavi

- La chiave di firma del token di sessione e la chiave privata di cifratura del
  payload sono custodite in un KMS o in un HSM. `LocalKeySigner` e le chiavi
  in-process sono fornite solo per lo sviluppo.
- La chiave di firma dei pin è custodita offline; le chiavi pubbliche sono
  incluse nelle applicazioni mobili.

## Prestazioni

`verifyRequest()` esegue una verifica locale della firma del token, un controllo
del timestamp, un'operazione sul nonce-store e un confronto HMAC. La latenza del
core misurata con store in memoria è p50 ≈ 190 µs, p99 ≈ 350 µs.

Consulta il [riferimento API backend](/youkey-sdk-docs/it/reference/backend/)
per la superficie esportata completa.
