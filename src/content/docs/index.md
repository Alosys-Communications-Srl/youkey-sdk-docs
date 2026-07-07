---
title: Overview
description: Technical documentation for the YouKey Security SDK, a mobile application security SDK for Android and iOS spanning transport security, request attestation, and payload encryption, with a companion backend SDK.
---

The YouKey Security SDK is a mobile application security SDK spanning three
layers: transport security (certificate pinning, TLS and cipher policy,
cleartext blocking), request attestation (proof that each request originates
from a genuine, attested application instance), and application-layer payload
encryption. A companion backend SDK implements the server side of the
attestation and encryption protocols.

It is a native SDK with no third-party runtime dependencies: the Android SDK
uses `android.*`, `javax.*`, `java.security.*`, and AndroidX `security-crypto`;
the iOS SDK uses `Security`, `CryptoKit`, and `Foundation`; the backend SDK
uses the Node.js standard library only.

## Capabilities

| Capability | Summary |
|---|---|
| Certificate pinning | SPKI SHA-256 pinning across the full certificate chain, with primary and backup pins and per-domain enforcement. |
| TLS and cipher policy | Configurable minimum TLS version and a fixed AEAD-only cipher-suite allowlist, enforced per handshake. |
| Cleartext blocking | Non-TLS requests are rejected before a connection is opened. |
| Remote pin updates | Certificate pins are rotated out of band via ECDSA-signed pin documents verified against compiled-in keys. |
| Violation reporting | Security events are delivered to an application callback and, optionally, batched to a reporting endpoint; undelivered events are persisted encrypted at rest. |
| Attestation and request signing | Per-request proof that a request originates from an attested application instance, via platform attestation or hardware-key enrollment. |
| Payload encryption | Optional application-layer encryption of request and response bodies beneath TLS, using HPKE (RFC 9180). |

## Standards

The SDK addresses MASVS-NETWORK-1 (secure network communication) and
MASVS-NETWORK-2 (public-key pinning), and provides additional controls beyond
those requirements.

## Distribution

| Component | Coordinate | Language |
|---|---|---|
| Android SDK | `it.alosys:youkey-sdk` (Maven) | Kotlin / Java |
| iOS SDK | XCFramework (Swift Package Manager) | Swift |
| Backend SDK | `@alosys/youkey-server` (npm) | TypeScript / Node.js |

The mobile SDKs and the backend SDK implement identical wire contracts, which
are verified by a cross-language conformance test suite.

## Document structure

- [Get started](/youkey-sdk-docs/get-started/): installation and initial
  configuration for Android and iOS.
- Guides: task-oriented reference for each capability.
- API reference: the public API of each SDK, and the enumerated violation
  codes.
- Compliance: MASVS-NETWORK coverage.
