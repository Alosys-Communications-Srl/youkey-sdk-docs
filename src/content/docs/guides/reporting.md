---
title: Violation reporting
description: Delivery of security violations to the application callback and a telemetry endpoint, with a persistent encrypted queue.
---

Every security event is delivered in two ways: synchronously to the
`onViolation` callback, and optionally in batches to a reporting endpoint over
the SDK's own pinned transport.

## The onViolation callback

The callback fires synchronously for every violation, blocking and advisory,
before the connection is aborted. Route it to your analytics or
logging:

```kotlin
onViolation { v ->
    MyAnalytics.track("security_violation", v.toMap())
}
```
```swift
.onViolation { v in
    MyAnalytics.track("security_violation", v.toReportPayload())
}
```

Each violation carries a `code` ([violation codes](/youkey-sdk-docs/reference/violation-codes/)),
the `domain`, a `timestamp`, and a `debugDescription`.

## Reporting to an endpoint

```kotlin
// Android
reporting {
    enabled = true
    endpoint = "https://security.example.com/violations"   // https:// only
    batchSize = 20
    flushIntervalSeconds = 60
    includeDeviceMetadata = true
}
```
```swift
// iOS
.reporting(enabled: true, endpoint: "https://security.example.com/violations")
```

Events are batched and flushed on the configured interval, with
exponential-backoff retry. The transport is subject to the SDK's own TLS and
pinning enforcement; the endpoint must use `https://`.

## Persistent, encrypted queue

Undelivered events survive process termination. Events are persisted encrypted
at rest, using Keystore-backed `EncryptedSharedPreferences` on Android and Data
Protection on iOS, and are delivered on the next launch. The queue is bounded
with drop-oldest behavior, and all disk I/O takes place off the request and
handshake paths. Persistence preserves incident evidence, as required by
regulations such as DORA.

`YoukeySDK.pendingViolationCount()` / `Youkey.pendingViolationCount()` returns
the number of queued events.

## End-to-end example

The following example enables endpoint reporting alongside the callback,
configures the batching parameters, and queries the pending queue. `batchSize`
(1–100), `flushIntervalSeconds` (10–300), and `includeDeviceMetadata` are set
inside the `reporting` block.

```kotlin
// Android
val config = YoukeySDK.config {
    pin("api.example.com") {
        publicKeyHash("sha256/AAAA…"); publicKeyHash("sha256/BBBB…")
        expiresAt = "2027-06-01"
    }
    reporting {
        enabled = true
        endpoint = "https://security.example.com/violations"   // https:// only
        batchSize = 20
        flushIntervalSeconds = 60
        includeDeviceMetadata = true      // attach device_model / network_type
    }
    onViolation { v -> MyAnalytics.track("security_violation", v.toMap()) }
}
YoukeySDK.install(this, config)

// Events persisted for delivery but not yet flushed (survives process death):
val pending = YoukeySDK.pendingViolationCount()
```

```swift
// iOS: endpoint is a String; batch/flush/metadata are optional arguments
let config = try Youkey.Configuration.builder()
    .pin(domain: "api.example.com") { pin in
        pin.publicKeyHash("sha256/AAAA…"); pin.publicKeyHash("sha256/BBBB…")
        pin.expiresAt = "2027-06-01"
    }
    .reporting(enabled: true,
               endpoint: "https://security.example.com/violations",
               batchSize: 20,
               flushIntervalSeconds: 60,
               includeDeviceMetadata: true)
    .onViolation { v in MyAnalytics.track("security_violation", v.toReportPayload()) }
    .build()
Youkey.install(config)

let pending = Youkey.pendingViolationCount()
```
