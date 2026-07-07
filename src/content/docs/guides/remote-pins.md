---
title: Remote (OTA) pin updates
description: Certificate-pin rotation without an application release, using signed remote pin documents (schema v2/v3, ECDSA P-256).
---

Remote pins rotate certificate pins without an application release. The SDK
fetches a JSON pin document over its own pinned transport, bootstrapped by a
compile-time pin for the pin host, and applies it.

## Document signing

Every remote pin document carries an ECDSA P-256 signature (schema v2); there
is no unsigned mode. The SDK verifies the signature against public keys
compiled into the application before applying the document. A `remotePinConfig`
without a signing key fails at configuration build; compromise of the pin host
therefore cannot compromise pinning.

```kotlin
// Android
remotePinConfig {
    url = "https://pins.example.com/pins-v2.json"
    bootstrapPinHash = "sha256/<pins.example.com key>"   // compiled in
    refreshIntervalHours = 24
    // ≥1 signing public key (base64 SPKI DER). Add a 2nd keyId before rotating.
    signingKey("youkey-pin-2026-a", "<base64 SPKI DER>")
}
```

```swift
// iOS
.remotePinConfig(
    url: "https://pins.example.com/pins-v2.json",
    refreshIntervalHours: 24,
    bootstrapPinHash: "sha256/<pins.example.com key>",
    signingKeys: ["youkey-pin-2026-a": "<base64 SPKI DER>"])
```

Trigger a refresh; the call is blocking on Android and asynchronous on iOS:

```kotlin
val updated = YoukeySDK.refreshRemotePins()   // blocking; returns #domains updated
```
```swift
Youkey.refreshRemotePins { updated in /* … */ }
```

## Document format

The signed payload is the RFC 8785 (JCS) canonical JSON of the document with the
`sig` envelope removed:

```jsonc
{
  "version": 7,                       // monotonic; must be > the cached version
  "updated": "2026-07-02T10:00:00Z",
  "expires": "2026-08-01T10:00:00Z",
  "pins": [
    { "domain": "api.example.com", "includeSubdomains": true,
      "hashes": ["sha256/…", "sha256/…"] }
  ],
  "sig": { "keyId": "youkey-pin-2026-a", "alg": "ES256", "signature": "base64url(DER)" }
}
```

A fetched document is rejected when the signature is missing, the `keyId` is
unknown, `alg` is not `ES256`, the signature is invalid, the version is not
greater than the cached version (anti-rollback), or the document has expired.
On rejection, the previous pins are retained and `REMOTE_PIN_FETCH_FAILED` is
emitted.

## Producing signed documents

Signed documents are produced with the `pin-signer` command-line tool or the
backend `pinsign` API. The private key remains offline or in an HSM and does
not reach the pin host:

```sh
node tools/pin-signer/pin-signer.mjs keygen --key-id youkey-pin-2026-a
node tools/pin-signer/pin-signer.mjs sign --key <private> --key-id youkey-pin-2026-a pins.json --out pins-signed.json
```

## Hosting

The pin document is a static JSON file, and the SDK performs only an HTTPS GET
against `url`. The pin host can therefore be any static HTTPS origin, such as
object storage behind a CDN or a static web server; no application server is
required. You produce and sign the document offline, and hosting is a plain
file upload.

Because the SDK fetches the document over its own pinned transport,
`bootstrapPinHash` must be the SPKI pin of the host that serves the document.
Compute it from that host's certificate:

```sh
openssl s_client -connect pins.example.com:443 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64 | sed 's/^/sha256\//'
```

You can therefore evaluate remote pins without server-side infrastructure: sign
the document, upload it to a static HTTPS host, set `url` and
`bootstrapPinHash`, and call `refreshRemotePins()`.

## End-to-end example

The following example configures the remote document at installation, with two
`keyId` values for a rotation overlap and a 12-hour refresh interval, triggers
a refresh off the main thread, and observes fetch failures. A failed refresh is
non-blocking and retains the previously applied pins.

```kotlin
// Android
import it.alosys.youkey.errors.ViolationCode
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

val config = YoukeySDK.config {
    // Bootstrap/current pins for the protected domain(s):
    pin("api.example.com") {
        publicKeyHash("sha256/AAAA…"); publicKeyHash("sha256/BBBB…")
        expiresAt = "2027-06-01"
    }
    remotePinConfig {
        url = "https://pins.example.com/pins-v2.json"
        bootstrapPinHash = "sha256/<pins.example.com key>"   // pin for the pin host
        refreshIntervalHours = 12
        signingKey("youkey-pin-2026-a", "<base64 SPKI DER>")
        signingKey("youkey-pin-2026-b", "<base64 SPKI DER>")  // overlap for rotation
    }
    onViolation { v ->
        if (v.code == ViolationCode.REMOTE_PIN_FETCH_FAILED) {
            Log.w("youkey", "remote pin refresh failed (previous pins kept): ${v.debugDescription}")
        }
    }
}
YoukeySDK.install(this, config)

// refreshRemotePins() blocks; run it off the main thread. Returns #domains updated.
scope.launch(Dispatchers.IO) {
    val updated = YoukeySDK.refreshRemotePins()
    Log.i("youkey", "remote pins applied to $updated domain(s)")
}
```

```swift
// iOS
let config = try Youkey.Configuration.builder()
    .pin(domain: "api.example.com") { pin in
        pin.publicKeyHash("sha256/AAAA…"); pin.publicKeyHash("sha256/BBBB…")
        pin.expiresAt = "2027-06-01"
    }
    .remotePinConfig(
        url: "https://pins.example.com/pins-v2.json",
        refreshIntervalHours: 12,
        bootstrapPinHash: "sha256/<pins.example.com key>",
        signingKeys: [
            "youkey-pin-2026-a": "<base64 SPKI DER>",
            "youkey-pin-2026-b": "<base64 SPKI DER>",   // overlap for rotation
        ])
    .onViolation { v in
        if v.code == .remotePinFetchFailed {
            print("remote pin refresh failed (previous pins kept): \(v.debugDescription)")
        }
    }
    .build()
Youkey.install(config)

// Async refresh; the Int is the number of domains updated.
Youkey.refreshRemotePins { updated in
    print("remote pins applied to \(updated) domain(s)")
}
```

## Rotation runbook

1. Add a new `keyId` (`…-b`) to the application configuration and ship the
   release.
2. Publish a document signed with `…-b`.
3. Retire `…-a` from the next application release.

Because the application trusts multiple `keyId` values during the overlap,
there is no interval in which verification fails.

## Schema v3 (encryption keys)

Schema v3 adds an optional signed `encryptionKeys` array that distributes the
[payload-encryption](/youkey-sdk-docs/guides/payload-encryption/) public key
through the same document. A v2 document remains valid.
