---
title: Backend API reference
description: "Public exports of @alosys/youkey-server: the verifier, attestation verifiers, stores, signers, and payload primitives."
---

Package `@alosys/youkey-server` (Node.js ≥ 22.6, TypeScript). The core has no
web-framework dependency; adapters are imported from the subpaths
`@alosys/youkey-server/express`, `/fastify`, and `/nest`.

## Verifier

| Export | Description |
|---|---|
| `YoukeyVerifier` | Main entry point. `attest(request)` performs the session exchange; `verifyRequest(input)` performs the per-request check; `issueDeviceChallenge()` / `enrollDevice(args)` support device-key enrollment; `revoke(jti)` revokes a session. |
| `VerifierOptions` | Constructor options: `tokenSigner`, `attestation` verifiers, `nonceStore`, `secretStore`, `clockSkewSeconds`, `tokenTtlSeconds`. |
| `Verdict`, `VerdictCode` | Result of `verifyRequest`. |

## Attestation verifiers

| Export | Description |
|---|---|
| `PlayIntegrityVerifier` | Verifies a Play Integrity token by local decryption (Play Console response keys). |
| `AppAttestVerifier` | Verifies an App Attest attestation object / assertion against Apple's App Attest root (supplied as a parameter). |
| `EnrolledKeyVerifier` | Device-key enrollment: `issueChallenge()`, `enroll(args)`, and `verify()` (challenge-response). |
| `InMemoryAppAttestKeyStore`, `InMemoryDeviceKeyStore`, `InMemoryChallengeStore` | Default in-memory store implementations. |
| `deviceIdFromSpki(spkiB64)` | Derives the device id (`base64url(SHA-256(SPKI))`). |

## Tokens and signing

| Export | Description |
|---|---|
| `LocalKeySigner` | In-process ES256 signer (development only). Production uses a KMS-backed `KeySigner`. |
| `issueToken`, `verifyToken` | Session-token (ES256 JWT) issuance and verification. |

## Payload encryption (HPKE)

| Export | Description |
|---|---|
| `generateServerKey()` | Generates a P-256 server keypair (`privateScalar`, `publicKeySpkiB64`). |
| `sealRequest`, `openRequest` | Client-side seal / server-side open of the §C.6 request envelope. |
| `sealResponse`, `openResponse` | Response encryption / decryption via the HPKE exporter key. |
| `requestAad` | Constructs the associated-data binding. |
| `youkeyPayloadMiddleware` | Express payload-decryption middleware. |

## Pin signing and telemetry

| Export | Description |
|---|---|
| `signPinDocument`, `verifyPinDocument` | Programmatic pin-document signing/verification (schema v2). |
| `ingestViolationBatch`, `InMemoryExporter` | Hardened violation-telemetry ingest with a pluggable exporter. |

## Canonicalization primitives

`canonicalize`, `canonicalRequest`, `canonicalQuery`, `bodyHashHex`, and
`percentEncode` are the wire-contract primitives, byte-identical to the mobile
SDKs. See the [wire contract](/youkey-sdk-docs/reference/wire-contract/).

## Adapters

| Subpath | Exports |
|---|---|
| `/express` | `youkeyAttestHandler`, `youkeyMiddleware`, `youkeyChallengeHandler`, `youkeyEnrollHandler` |
| `/fastify` | `youkeyAttestHandler`, `youkeyPreHandler`, `youkeyChallengeHandler`, `youkeyEnrollHandler` |
| `/nest` | `youkeyGuard` |
