---
title: Payload encryption
description: Application-layer encryption of request and response bodies beneath TLS, using HPKE (RFC 9180).
---

## Purpose

Application-layer payload encryption (ALPE) encrypts the request and response
body end to end between the application process and the customer's application
tier, beneath TLS. It protects body content from TLS-terminating intermediaries
(CDN edge nodes, load balancers, web application firewalls, and reverse
proxies), which observe plaintext under TLS alone.

ALPE is a defense-in-depth measure. It is not a replacement for TLS (request
metadata, headers, size, and timing remain protected by TLS only) and not a
replacement for [attestation](/youkey-sdk-docs/guides/attestation/), which
authenticates the client. It is optional and additive; applications that do not
configure it are unaffected.

## Cryptography

ALPE uses HPKE (RFC 9180) in base mode with the ciphersuite
`DHKEM(P-256, HKDF-SHA256) / HKDF-SHA256 / AES-256-GCM`. Each request body is
sealed to the server's static public key with a fresh ephemeral key
(single-shot; no handshake and no per-session server state). The response is
encrypted with AES-256-GCM under a key derived from the same HPKE context's
exporter secret, so responses require no second key encapsulation.

The implementation is validated against published RFC 9180 test vectors and is
byte-identical across the Android, iOS, and backend SDKs.

## Configuration

The server's public key is compiled into the application and, in production,
rotated through the signed pin document (schema v3 `encryptionKeys`).

```kotlin
// Android
encryption {
    serverKeyId = "enc-2026-a"
    serverPublicKeySpkiBase64 = "<base64 SPKI DER of the server P-256 key>"
    protectDomain("api.example.com")
    failClosed = true   // default
}
```

```swift
// iOS
.encryption(try EncryptionConfiguration(
    serverKeyId: "enc-2026-a",
    serverPublicKeySpkiB64: "<base64 SPKI DER of the server P-256 key>",
    protectedDomains: ["api.example.com"]))
```

## Client integration

- **Android:** requests to a protected domain sent through
  `YoukeySDK.okHttpInterceptor()` have their body sealed automatically, and the
  encrypted response is decrypted transparently. When request signing is also
  enabled, the signature is computed over the plaintext before encryption.
- **iOS:** `URLSession` provides no interceptor chain; encrypt explicitly and
  decrypt the response with the returned handle:

  ```swift
  let (encrypted, handle) = try Youkey.encryption()!.encrypt(request)
  let (data, response) = try await session.data(for: encrypted)
  let plaintext = try handle!.openResponse(
      data, statusCode: (response as! HTTPURLResponse).statusCode)
  ```

## Wire format

A protected request carries the header `X-Youkey-Enc: v1; keyId=<keyId>` and a
body of `enc_len(2) ‖ enc ‖ ciphertext`, where `enc` is the HPKE encapsulated
key and the AEAD associated data binds the ciphertext to the request method and
path. The full specification is in the
[wire contract](/youkey-sdk-docs/reference/wire-contract/).

## Failure policy

When a protected request cannot be encrypted (for example, a streamed request
body, which cannot be hashed), the configured policy applies:

- `failClosed = true` (default): the request is blocked.
- `failClosed = false`: the request proceeds unencrypted and a
  `CONFIGURATION_WARNING` diagnostic is emitted (for staged rollout only).

## Verification

1. Send a request to a protected domain, capture it at the network layer, and
   confirm that the body is ciphertext.
2. Confirm that the server decrypts the request and that the response is
   returned encrypted and decrypted transparently by the client.
3. Alter the request method or path in transit, and confirm that decryption
   fails (associated-data binding).
