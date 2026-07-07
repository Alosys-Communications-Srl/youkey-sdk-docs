---
title: TLS & cipher policy
description: Minimum TLS version and AEAD-only cipher-suite enforcement in the YouKey SDK.
---

On every handshake the SDK enforces a minimum TLS version and an allowlist of
cipher suites, in addition to certificate pinning.

## Minimum TLS version

`minTlsVersion` defaults to TLS 1.2; set TLS 1.3 to require it. A server that
negotiates a lower protocol raises a blocking `TLS_VERSION_TOO_LOW`.

```kotlin
// Android
minTlsVersion = TlsVersion.TLS_1_3
```
```swift
// iOS
.minTlsVersion(.tlsV13)
```

With `TLS_1_2` the SDK enables `["TLSv1.3", "TLSv1.2"]`; with `TLS_1_3` only
`["TLSv1.3"]`.

## Cipher-suite allowlist

The SDK restricts negotiation to a fixed set of AEAD cipher suites. A server
that selects a suite outside the allowlist raises `WEAK_CIPHER_SUITE`; the
check applies where the negotiated suite is observable. CBC and other non-AEAD
suites are rejected. The allowlist is not configurable.

## Enforcement mechanism

- **Android:** the `SSLSocketFactory` from `YoukeySDK.sslSocketFactory()` sets
  the enabled protocols and cipher suites; the `SecurityTrustManager` validates
  the negotiated protocol and cipher during the handshake.
- **iOS:** `Youkey.sessionConfiguration()` applies the minimum TLS version to
  the `URLSessionConfiguration`; the trust evaluator validates the negotiated
  connection.

Both are applied when the HTTP client is constructed as shown in
[Get started](/youkey-sdk-docs/get-started/).

## Observing TLS violations

TLS-policy events are delivered to `onViolation`. `TlsVersionTooLow` carries
the negotiated protocol; `WeakCipherSuite` carries the rejected cipher suite.

```kotlin
// Android
import it.alosys.youkey.errors.SecurityViolation

onViolation { v ->
    when (v) {
        is SecurityViolation.TlsVersionTooLow ->
            Log.w("youkey", "${v.domain}: negotiated ${v.negotiatedProtocol} below the floor")
        is SecurityViolation.WeakCipherSuite ->
            Log.w("youkey", "${v.domain}: weak cipher ${v.cipher}")
        else -> Unit
    }
}
```

```swift
// iOS
.onViolation { v in
    switch v {
    case let .tlsVersionTooLow(domain, negotiatedVersion, _):
        print("\(domain): negotiated \(negotiatedVersion.protocolName) below the floor")
    case let .weakCipherSuite(domain, cipher, _):
        print("\(domain): weak cipher \(cipher)")
    default:
        break
    }
}
```
