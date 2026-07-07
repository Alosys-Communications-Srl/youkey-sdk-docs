---
title: Cleartext blocking
description: Rejection of http:// traffic before a socket opens in the YouKey SDK.
---

With `blockCleartext = true` (the default), any `http://` or other non-TLS
request is rejected before a socket is opened, raising
`CLEARTEXT_NOT_PERMITTED`. `https://` and `wss://` are allowed.

```kotlin
// Android: default true
blockCleartext = true
```
```swift
// iOS: default true
.blockCleartext(true)
```

This check is the runtime component of cleartext protection:

- **Android:** the OkHttp interceptor and the `HttpsURLConnection` hook check
  the URL scheme, deliver the violation synchronously to the callback, and
  throw a `SecurityViolationException` (an `IOException`). Pair the runtime
  check with a manifest `network-security-config` as the static component.
- **iOS:** the SDK's `URLSession` delegate blocks cleartext traffic. Pair the
  runtime check with App Transport Security (`NSAppTransportSecurity`) as the
  static component.

Keep cleartext blocking enabled in production. It is disabled automatically in
[debug mode](/youkey-sdk-docs/guides/debug-mode/).

## End-to-end example

An `http://` request is rejected before a socket opens, raising
`CLEARTEXT_NOT_PERMITTED`. On Android the blocked call throws a
`SecurityViolationException` (an `IOException`); on iOS the request is
cancelled with a `URLError`, and the typed violation is delivered to
`onViolation`.

```kotlin
// Android: the call is aborted before connecting
import it.alosys.youkey.errors.SecurityViolationException

try {
    client.newCall(Request.Builder().url("http://api.example.com/").build()).execute()
} catch (e: SecurityViolationException) {
    // e.code == ViolationCode.CLEARTEXT_NOT_PERMITTED
    Log.w("youkey", "blocked cleartext to ${e.domain}")
}
```

```swift
// iOS: blockCleartext(true) is the default; the request is cancelled
let task = session.dataTask(with: URL(string: "http://api.example.com/")!) { _, _, error in
    // error is a cancelled URLError; the typed CLEARTEXT_NOT_PERMITTED
    // violation arrives on the onViolation callback.
    if let error { print("blocked: \(error.localizedDescription)") }
}
task.resume()
```
