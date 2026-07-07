---
title: Android API reference
description: "Public API of the YouKey Android SDK: the YoukeySDK entry point and the configuration DSL."
---

Package `it.alosys.youkey`. All configuration is built through the
`YoukeySDK.config { }` DSL and sealed by `install()`. The public API is
Java-callable.

## `YoukeySDK`

| Member | Signature | Description |
|---|---|---|
| `SDK_VERSION` | `String` | The SDK version. |
| `config` | `config(block: SDKConfig.Builder.() -> Unit): SDKConfig` | Builds a configuration via the DSL. |
| `install` | `install(context: Context, config: SDKConfig, hookHttpURLConnection: Boolean = true)` | Validates and seals the configuration and initializes all layers. Throws `IllegalStateException` if called twice. |
| `okHttpInterceptor` | `(): OkHttpSecurityInterceptor` | Interceptor for the application's `OkHttpClient`. |
| `sslSocketFactory` | `(): SSLSocketFactory` | Hardened socket factory (TLS/cipher policy + pinning). |
| `trustManager` | `(): SecurityTrustManager` | Pinning trust manager. |
| `hostnameVerifier` | `(): HostnameVerifier` | Hostname verifier. |
| `refreshRemotePins` | `(): Int` | Fetches and applies a remote pin update; returns the number of domains updated. Blocking; call off the main thread. |
| `attestation` | `(): AttestationClient?` | The attestation session client, or `null` if not configured. |
| `config` | `(): SDKConfig` | The installed configuration. |
| `pendingViolationCount` | `(): Int` | Number of queued, undelivered violations. |

## Configuration DSL: `SDKConfig.Builder`

| Setting | Type | Default | Notes |
|---|---|---|---|
| `minTlsVersion` | `TlsVersion` | `TLS_1_2` | Minimum negotiated TLS version. |
| `blockCleartext` | `Boolean` | `true` | Reject non-TLS requests. |
| `pinExpiryWarningDays` | `Int` | `30` | Days before `expiresAt` to begin `PIN_EXPIRY_WARNING`. |
| `debugMode` | `Boolean` | `false` | Bypass enforcement (guarded against release builds). |
| `pin(domain) { … }` | block | — | Per-domain pin configuration (see below). |
| `remotePinConfig { … }` | block | — | Signed remote pin updates. |
| `attestation { … }` | block | — | Attestation and request signing. |
| `encryption { … }` | block | — | Payload encryption. |
| `reporting { … }` | block | — | Violation reporting. |
| `onViolation { … }` | `(SecurityViolation) -> Unit` | — | Synchronous violation callback. |

### `pin(domain) { … }`: `PinConfig.Builder`

| Member | Type | Default | Notes |
|---|---|---|---|
| `publicKeyHash(hash)` | call, repeatable | — | Append a `sha256/…` pin; first call is the primary. Minimum of two. |
| `includeSubdomains` | `Boolean` | `false` | Also match subdomains. |
| `expiresAt` | `String` (yyyy-MM-dd) | — | Required. Drives `PIN_EXPIRY_WARNING`. |
| `enforcementMode` | `EnforcementMode` | `ENFORCE` | `ENFORCE` or `REPORT_ONLY`. |
| `enforceExpiry` | `Boolean` | `false` | When true, block after `expiresAt`. |

### `remotePinConfig { … }`: `RemotePinConfig.Builder`

| Member | Type | Notes |
|---|---|---|
| `url` | `String` | HTTPS pin-document URL. |
| `bootstrapPinHash` | `String` | Compile-time pin for the pin host. |
| `refreshIntervalHours` | `Int` (default 24) | Background refresh cadence. |
| `signingKey(keyId, spkiBase64)` | call, repeatable | Required (≥ 1). ECDSA P-256 public keys that documents must be signed with. |

### `attestation { … }`: `AttestationConfig.Builder`

| Member | Type | Notes |
|---|---|---|
| `attestUrl` | `String` | The `/attest` endpoint. |
| `provider` | `AttestationTokenProvider` | `PlayIntegrityTokenProvider` or `DeviceKeyProvider`. |
| `protectDomain(domain)` | call, repeatable | Domains whose requests are signed. |
| `challengeUrl` / `enrollUrl` | `String?` | Device-key enrollment endpoints (set together). |
| `coldStartPolicy` | `ColdStartPolicy` | `QUEUE_THEN_FAIL` (default), `MONITOR`, `BLOCK`. |
| `coldStartTimeoutMillis` | `Long` (default 10000) | Wait budget for `QUEUE_THEN_FAIL`. |

### `encryption { … }`: `EncryptionConfig.Builder`

| Member | Type | Notes |
|---|---|---|
| `serverKeyId` | `String` | Key identifier for the `X-Youkey-Enc` header. |
| `serverPublicKeySpkiBase64` | `String` | Base64 SPKI DER of the server P-256 key. |
| `protectDomain(domain)` | call, repeatable | Domains whose bodies are encrypted. |
| `failClosed` | `Boolean` (default true) | Block vs proceed unencrypted when encryption is unavailable. |

### `reporting { … }`: `ReportingConfig.Builder`

| Member | Type | Default | Notes |
|---|---|---|---|
| `enabled` | `Boolean` | `false` | Enable endpoint reporting. |
| `endpoint` | `String` | — | HTTPS reporting endpoint. |
| `batchSize` | `Int` | `20` | Events per flush. |
| `flushIntervalSeconds` | `Int` | `60` | Flush cadence. |
| `includeDeviceMetadata` | `Boolean` | `true` | Include device metadata. |
