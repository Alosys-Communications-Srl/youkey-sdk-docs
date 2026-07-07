---
title: Backend integration
description: Install and configure @alosys/youkey-server to verify attested, signed, and encrypted requests server-side.
---

## Purpose

The backend SDK, `@alosys/youkey-server`, verifies attested, signed, and
encrypted requests in your backend. It issues session tokens to attested
application instances, validates the signature on each protected request, and
decrypts encrypted request bodies. Adapters are provided for Express, Fastify,
and Nest; the core also works with any Node.js server.

If your application uses only the mobile transport features (pinning, TLS
policy, cleartext blocking, remote pins), you do not need the backend SDK.

## Installation

```sh
npm install @alosys/youkey-server
```

## Verifier

`YoukeyVerifier` exposes `attest()` (the once-per-session exchange) and
`verifyRequest()` (the per-request check). Storage and signing are pluggable
through interfaces; in-memory implementations are provided for development.

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

## Route wiring (Express)

```ts
import express from "express";
import { youkeyAttestHandler, youkeyMiddleware } from "@alosys/youkey-server/express";

const app = express();
// The request signature covers the raw body bytes; retain them.
app.use(express.json({ verify: (req, _res, buf) => { (req as any).rawBody = buf; } }));

app.post("/attest", youkeyAttestHandler(verifier));
app.use("/api/sensitive", youkeyMiddleware(verifier, { policy: "enforce" }));
```

Fastify and Nest adapters expose equivalent handlers
(`@alosys/youkey-server/fastify`, `@alosys/youkey-server/nest`).

## Device-key enrollment routes

When using device-key enrollment, mount the challenge and enrollment handlers.
Place the enrollment route behind your existing session authentication, and
supply a function that extracts your customer identifier from the
authenticated request.

```ts
import { youkeyChallengeHandler, youkeyEnrollHandler } from "@alosys/youkey-server/express";

app.get("/challenge", youkeyChallengeHandler(verifier));
app.post("/enroll", bankSessionAuth, youkeyEnrollHandler(verifier, (req) => req.session.customerId));
```

## Payload decryption

`youkeyPayloadMiddleware` decrypts the request body before the route handler
runs and encrypts the response. Mount it ahead of the JSON body parser on
protected routes.

```ts
import { youkeyPayloadMiddleware } from "@alosys/youkey-server";

app.use("/api/sensitive", youkeyPayloadMiddleware({
  keys: { "enc-2026-a": { publicKeySpkiB64, privateScalar } },
  policy: "enforce",
}));
```

## Key management

- The session-token signing key and the payload-encryption private key are held
  in KMS or an HSM. `LocalKeySigner` and in-process keys are provided for
  development only.
- The pin-signing key is held offline; the public keys are compiled into the
  mobile applications.

## Performance

`verifyRequest()` performs a local token-signature verification, a timestamp
check, one nonce-store operation, and an HMAC comparison. Measured core latency
with in-memory stores is p50 ≈ 190 µs, p99 ≈ 350 µs.

See the [backend API reference](/youkey-sdk-docs/reference/backend/) for the
complete exported surface.
