---
title: Certificate pinning
description: "SPKI certificate pinning in the YouKey SDK: primary and backup pins, subdomains, wildcards, enforcement modes, and fail-closed expiry."
---

YouKey pins the SHA-256 of the **SubjectPublicKeyInfo (SPKI)** of certificates
in the server chain. A pin is the string `sha256/<base64(SHA-256(SPKI DER))>`.
Pinning is applied in addition to platform CA validation; a connection must
pass both.

## The pin model

You configure an ordered list of pins for each domain:

- The first pin is the **primary**, which is expected to match on every
  connection.
- The remaining pins are **backups**, held in reserve for rotation without
  downtime.

OWASP requires at least one primary and one backup pin; the SDK therefore
requires at least two pins per domain, and configuration building fails
otherwise. Matching evaluates the full chain (leaf, intermediates, and root):

- A primary match succeeds and emits no event.
- A backup-only match succeeds and emits a non-blocking
  `PIN_ROTATION_RECOMMENDED` event, indicating that you should rotate the
  primary pin.
- No match raises `CERTIFICATE_PINNING_FAILED`, which blocks the connection in
  `ENFORCE` mode.

## Configuring pins

```kotlin
// Android
pin("api.example.com") {
    publicKeyHash("sha256/AAAA…")   // primary (first call)
    publicKeyHash("sha256/BBBB…")   // backup
    includeSubdomains = false        // default
    expiresAt = "2027-06-01"         // required, yyyy-MM-dd
    enforcementMode = EnforcementMode.ENFORCE   // default; or REPORT_ONLY
    enforceExpiry = false            // default; see below
}
```

```swift
// iOS
.pin(domain: "api.example.com") { pin in
    pin.publicKeyHash("sha256/AAAA…")
    pin.publicKeyHash("sha256/BBBB…")
    pin.includeSubdomains = false
    pin.expiresAt = "2027-06-01"
    pin.enforcementMode = .enforce   // or .reportOnly
    pin.enforceExpiry = false
}
```

### Domain matching

- **Exact:** `api.example.com` matches only that host.
- **Subdomains:** setting `includeSubdomains = true` extends the match to
  `*.api.example.com`.
- **Wildcard:** a domain written as `*.example.com` matches its subdomains and
  the base domain `example.com`. A suffix without a dot boundary does not
  match; `evilexample.com` does not match `*.example.com`.

## Enforcement mode

- `ENFORCE` (default): a pin failure aborts the connection.
- `REPORT_ONLY`: the violation is delivered to the callback and to reporting,
  and the request proceeds. This mode supports staged rollout: review the
  telemetry, confirm that there are no false positives, and then switch to
  `ENFORCE`.

## Pin expiry

`expiresAt` produces a non-blocking `PIN_EXPIRY_WARNING` beginning
`pinExpiryWarningDays` (default 30) before the date, and continuing past it.

Set `enforceExpiry = true` to make expiry fail closed: after `expiresAt`, the
connection is blocked with `CERTIFICATE_PINNING_FAILED` even if the pin still
matches. The default is `false`, in which case expiry only produces warnings;
enable it per domain once your certificate-rotation process is
established. On both platforms, enforcement begins the day after `expiresAt`;
the pin remains valid through the entire expiry day.

## Computing a pin

The pin is the base64-encoded SHA-256 of the certificate's SPKI DER. Compute it
from a certificate file, or directly from a live server.

#### From a certificate file

```sh
openssl x509 -in cert.pem -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
# → prefix with "sha256/"
```

#### From a live server

```sh
openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
# → prefix with "sha256/"
```

Pin the public key (SPKI) rather than the certificate; the pin then remains
valid across certificate renewals for as long as the key is reused.

## Configuration variations

#### Staged rollout

Deploy new or rotated pins in `REPORT_ONLY`, confirm from the telemetry that
there are no false positives, and then switch to `ENFORCE`.

```kotlin
// Android
pin("api.example.com") {
    publicKeyHash("sha256/AAAA…")
    publicKeyHash("sha256/BBBB…")
    expiresAt = "2027-06-01"
    enforcementMode = EnforcementMode.REPORT_ONLY   // report without blocking
}
```
```swift
// iOS
.pin(domain: "api.example.com") { pin in
    pin.publicKeyHash("sha256/AAAA…")
    pin.publicKeyHash("sha256/BBBB…")
    pin.expiresAt = "2027-06-01"
    pin.enforcementMode = .reportOnly
}
```

#### Fail-closed expiry with a longer warning window

`pinExpiryWarningDays` is a top-level setting (default 30); `enforceExpiry` is
per domain.

```kotlin
// Android
YoukeySDK.config {
    pinExpiryWarningDays = 45          // PIN_EXPIRY_WARNING starts 45 days out
    pin("api.example.com") {
        publicKeyHash("sha256/AAAA…")
        publicKeyHash("sha256/BBBB…")
        expiresAt = "2027-06-01"
        enforceExpiry = true          // block after expiry, even if the pin matches
    }
}
```
```swift
// iOS
try Youkey.Configuration.builder()
    .pinExpiryWarningDays(45)
    .pin(domain: "api.example.com") { pin in
        pin.publicKeyHash("sha256/AAAA…")
        pin.publicKeyHash("sha256/BBBB…")
        pin.expiresAt = "2027-06-01"
        pin.enforceExpiry = true
    }
    // …
```

#### Multiple domains and subdomains

Configure one `pin` block per domain; set `includeSubdomains` to cover
subdomains.

```kotlin
// Android
YoukeySDK.config {
    pin("api.example.com") {
        publicKeyHash("sha256/AAAA…"); publicKeyHash("sha256/BBBB…")
        expiresAt = "2027-06-01"
        includeSubdomains = true      // also matches *.api.example.com
    }
    pin("cdn.example.com") {
        publicKeyHash("sha256/CCCC…"); publicKeyHash("sha256/DDDD…")
        expiresAt = "2027-06-01"
    }
}
```

## End-to-end example

A complete integration installs the SDK at process start, builds the HTTP
client from the SDK's components, makes a request, and handles violations. Every event is delivered synchronously to `onViolation`, both
blocking and advisory; the two are distinguished by `code.blocksConnection`. On
Android, a blocking violation additionally aborts the call with a
`SecurityViolationException`, which is an `IOException`.

```kotlin
// Android: Application, client, request, and both observation paths
import android.app.Application
import android.util.Log
import it.alosys.youkey.YoukeySDK
import it.alosys.youkey.config.EnforcementMode
import it.alosys.youkey.config.TlsVersion
import it.alosys.youkey.errors.SecurityViolationException
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.IOException

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        val config = YoukeySDK.config {
            minTlsVersion = TlsVersion.TLS_1_2
            blockCleartext = true
            pin("api.example.com") {
                publicKeyHash("sha256/AAAA…")   // primary
                publicKeyHash("sha256/BBBB…")   // backup (>= 2 required)
                includeSubdomains = true
                expiresAt = "2027-06-01"        // required
                enforcementMode = EnforcementMode.ENFORCE
            }
            onViolation { v ->
                val severity = if (v.code.blocksConnection) "BLOCK" else "ADVISORY"
                Log.w("youkey", "[$severity] ${v.code} ${v.domain}: ${v.debugDescription}")
            }
        }
        YoukeySDK.install(this, config)
    }
}

val client = OkHttpClient.Builder()
    .addInterceptor(YoukeySDK.okHttpInterceptor())
    .sslSocketFactory(YoukeySDK.sslSocketFactory(), YoukeySDK.trustManager())
    .hostnameVerifier(YoukeySDK.hostnameVerifier())
    .build()

fun fetch(url: String) {
    try {
        client.newCall(Request.Builder().url(url).build()).execute().use { resp ->
            Log.i("youkey", "allowed: HTTP ${resp.code}")
        }
    } catch (e: SecurityViolationException) {
        // A blocking violation (e.g. CERTIFICATE_PINNING_FAILED) aborts the call.
        Log.w("youkey", "blocked by ${e.code} on ${e.domain}")
    } catch (e: IOException) {
        Log.w("youkey", "network error: ${e.message}")
    }
}
```

```swift
// iOS: install, session, request, and violation handling
import Foundation
import YoukeySDK

let config = try Youkey.Configuration.builder()
    .minTlsVersion(.tlsV12)
    .blockCleartext(true)
    .pin(domain: "api.example.com") { pin in
        pin.publicKeyHash("sha256/AAAA…")   // primary
        pin.publicKeyHash("sha256/BBBB…")   // backup (>= 2 required)
        pin.includeSubdomains = true
        pin.expiresAt = "2027-06-01"        // required
        pin.enforcementMode = .enforce
    }
    .onViolation { v in
        let severity = v.code.blocksConnection ? "BLOCK" : "ADVISORY"
        print("[\(severity)] \(v.code.name) \(v.domain): \(v.debugDescription)")
    }
    .build()
Youkey.install(config)

let session = URLSession(
    configuration: Youkey.sessionConfiguration(),
    delegate: Youkey.urlSessionDelegate(),
    delegateQueue: nil)

// A blocked request returns a cancelled URLError to the caller; the typed
// SecurityViolation arrives separately on the onViolation callback above.
let task = session.dataTask(with: URL(string: "https://api.example.com/")!) { _, response, error in
    if let http = response as? HTTPURLResponse {
        print("allowed: HTTP \(http.statusCode)")
    } else if let error {
        print("aborted: \(error.localizedDescription)")
    }
}
task.resume()
```
