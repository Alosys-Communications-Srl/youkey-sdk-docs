---
title: Wire contract
description: "The wire formats shared by the YouKey mobile and backend SDKs: pin-document signing, request signing, headers, anti-replay, and payload encryption."
---

The mobile SDKs and the backend SDK implement identical wire formats, verified
by a cross-language conformance test suite. This page summarizes the formats
that integrators observe on the wire.

## Pin-document signature

The signed payload is the RFC 8785 (JCS) canonical JSON of the document with
the `sig` object removed. The signature is `ECDSA-P256-SHA256` over the
canonical bytes, DER-encoded, then base64url (no padding). `alg` is fixed to
`ES256`; `keyId` selects one of the application's compiled-in public keys.

```jsonc
"sig": { "keyId": "youkey-pin-2026-a", "alg": "ES256", "signature": "base64url(DER ECDSA)" }
```

## Request signing

The canonical request string is:

```
UPPER(method) ‖ "\n" ‖
path ‖ "\n" ‖                         // no query, as sent
canonicalQuery ‖ "\n" ‖               // params sorted by name then value, RFC 3986-encoded, "&"-joined
lower(hex(sha256(body))) ‖ "\n" ‖     // empty-body constant if no body
timestamp ‖ "\n" ‖                    // unix seconds, integer string
nonce                                 // base64url, 128-bit
```

The signature is `base64url(HMAC-SHA256(hmacSecret, UTF8(canonical)))`, no
padding.

### Headers

| Header | Value |
|---|---|
| `X-Youkey-Token` | Short-lived session token from `/attest`, opaque to the client. |
| `X-Youkey-Timestamp` | Unix seconds, integer string. |
| `X-Youkey-Nonce` | base64url, 128-bit, unique per request. |
| `X-Youkey-Signature` | base64url HMAC-SHA256 of the canonical string. |

### Anti-replay

The server rejects a request when `|now − timestamp|` exceeds the clock-skew
window (300 seconds) or when the nonce has already been seen within that
window. The nonce store's TTL equals the skew window.

## Attestation exchange (`/attest`)

Request (client → server): `platform`, and either `integrityToken` (Android
Play Integrity), `attestation`/`assertion` + `keyId` (iOS App Attest), or
`deviceId` + `challenge` + `challengeSignature` (device-key enrollment), plus a
`clientNonce`. Response (server → client): `token`, `hmacSecret`
(base64url, 32 bytes), `expiresAt`, `refreshBefore`.

## Payload encryption

HPKE (RFC 9180) base mode, ciphersuite
`DHKEM(P-256, HKDF-SHA256) / HKDF-SHA256 / AES-256-GCM`, with
`info = "youkey-alpe/v1"`.

- **Header:** `X-Youkey-Enc: v1; keyId=<keyId>`.
- **Request body:** `enc_len(2, big-endian) ‖ enc ‖ ciphertext`, where `enc` is
  the HPKE encapsulated key and the associated data is
  `UPPER(method) ‖ 0x00 ‖ path`.
- **Response body:** `nonce(12) ‖ AES-256-GCM(respKey, nonce, aad = statusCode, body)`,
  where `respKey` is the HPKE context's exporter secret for the context
  `"youkey-alpe/v1 response"`.

Documents contain only integers, strings, booleans, arrays, and objects (no
floating-point numbers), so canonicalization is deterministic across languages.
