---
title: Violation codes
description: The security-violation codes emitted by the YouKey SDK and whether each aborts the connection.
---

Every security event carries a violation code, the affected domain, a
timestamp, and a human-readable description. Codes marked **Blocking** abort the
connection in `ENFORCE` mode; non-blocking codes are advisory and allow the
request to proceed.

| Code | Blocking | Meaning |
|---|:---:|---|
| `CERTIFICATE_PINNING_FAILED` | Yes | No configured pin matched any certificate in the server chain. Also raised when the peer host cannot be determined on a pinned application, and (with `enforceExpiry`) when a pin has expired. |
| `UNTRUSTED_CERTIFICATE` | Yes | The chain failed platform validation: self-signed, expired, revoked, untrusted CA, or hostname mismatch. |
| `TLS_VERSION_TOO_LOW` | Yes | The negotiated TLS version is below the configured minimum. |
| `WEAK_CIPHER_SUITE` | Yes | The server selected a cipher suite not on the AEAD allowlist. |
| `CLEARTEXT_NOT_PERMITTED` | Yes | A non-TLS (`http://`) request was attempted while cleartext blocking is enabled. |
| `PIN_ROTATION_RECOMMENDED` | No | The primary pin did not match but a backup pin did; rotate the primary. |
| `PIN_EXPIRY_WARNING` | No | A configured pin is within the warning window of, or past, its `expiresAt` date. |
| `REMOTE_PIN_FETCH_FAILED` | No | A remote pin update could not be fetched, verified, or applied; the previous pins remain active. |
| `CONFIGURATION_WARNING` | No | A potentially insecure or degraded condition; for example, an uncomputable SPKI pin, or a signing/encryption operation unavailable under a monitor policy. |

Codes are stable across platforms and appear identically in the `onViolation`
callback and the reporting payload.
