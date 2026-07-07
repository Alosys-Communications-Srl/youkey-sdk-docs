---
title: Compliance
description: OWASP MASVS-NETWORK coverage provided by the YouKey SDK.
---

The YouKey SDK provides controls aligned with the OWASP Mobile Application
Security Verification Standard (MASVS), NETWORK category, and adds controls
beyond those requirements.

## MASVS-NETWORK coverage

| Requirement | Coverage |
|---|---|
| **MASVS-NETWORK-1**: Secure network communication (encrypted channels, TLS configuration) | Configurable minimum TLS version (1.2 or 1.3); a fixed AEAD-only cipher-suite allowlist enforced per handshake; cleartext (`http://`) blocked before a connection is opened; platform certificate-chain validation retained in addition to pinning. |
| **MASVS-NETWORK-2**: Public-key/certificate pinning | SPKI SHA-256 pinning across the full certificate chain, with primary and backup pins; per-domain enforce/report-only; optional fail-closed expiry; out-of-band pin rotation via ECDSA-signed pin documents verified against compiled-in keys. |

## Additional controls beyond MASVS-NETWORK

- **Request attestation:** per-request proof that traffic originates from a
  genuine, attested application instance (platform attestation or hardware-key
  enrollment) with server-side verification.
- **Application-layer payload encryption:** HPKE (RFC 9180) encryption of
  request and response bodies beneath TLS, protecting content from
  TLS-terminating intermediaries.
- **Tamper-evident violation reporting:** synchronous callback delivery plus
  batched endpoint reporting, with undelivered events persisted encrypted at
  rest for incident evidence.
