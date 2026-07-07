---
title: iOS API reference
description: "Public API of the YouKey iOS SDK: the Youkey entry point and the SDKConfiguration builder."
---

Module `YoukeySDK`. The entry-point type is `Youkey`; configuration is built
with `SDKConfiguration.builder()` and sealed by `Youkey.install(_:)`.

## `Youkey`

| Member | Signature | Description |
|---|---|---|
| `sdkVersion` | `static let String` | The SDK version. |
| `install` | `static func install(_ config: SDKConfiguration)` | Validates and seals the configuration and initializes all layers. Calling twice triggers `fatalError`. |
| `urlSessionDelegate` | `() -> SDKURLSessionDelegate` | Delegate for `URLSession(configuration:delegate:delegateQueue:)`. |
| `sessionConfiguration` | `(base: URLSessionConfiguration = .default) -> URLSessionConfiguration` | Configuration with the TLS policy applied. |
| `serverTrustEvaluator` | `() -> AlamofireTrustEvaluator` | Alamofire-compatible trust evaluator. |
| `refreshRemotePins` | `(completion: @escaping (Int) -> Void)` | Fetches and applies a remote pin update. |
| `configuration` | `() -> SDKConfiguration` | The installed configuration. |
| `pendingViolationCount` | `() -> Int` | Number of queued, undelivered violations. |
| `attestation` | `() -> AttestationClient?` | The attestation session client, or `nil`. |
| `encryption` | `() -> PayloadEncryptor?` | The payload encryptor, or `nil`. |

## Configuration: `SDKConfiguration.Builder`

Fluent, chainable; all setters return `Builder`. `build()` throws
`ConfigurationError` on invalid input.

| Method | Notes |
|---|---|
| `minTlsVersion(_ value: TlsVersion)` | Minimum TLS version (default `.tlsV12`). |
| `blockCleartext(_ value: Bool)` | Reject non-TLS requests (default `true`). |
| `pinExpiryWarningDays(_ value: Int)` | Warning window (default 30). |
| `pin(domain:_:)` | Per-domain pin configuration closure. |
| `remotePinConfig(url:refreshIntervalHours:bootstrapPinHash:signingKeys:)` | Signed remote pin updates. `signingKeys` (≥ 1) maps keyId → base64 SPKI DER. |
| `attestation(_ configuration: AttestationConfiguration)` | Attestation and request signing. |
| `encryption(_ configuration: EncryptionConfiguration)` | Payload encryption. |
| `reporting(enabled:endpoint:batchSize:flushIntervalSeconds:includeDeviceMetadata:)` | Violation reporting. |
| `onViolation(_:)` | Synchronous violation callback. |
| `debugMode(_ value: Bool)` | Bypass enforcement (guarded against release builds). |

### `pin(domain:) { pin in … }`: `PinConfiguration.Builder`

| Member | Type | Default | Notes |
|---|---|---|---|
| `publicKeyHash(_:)` | call, repeatable | — | Append a `sha256/…` pin; first is primary. Minimum of two. |
| `includeSubdomains` | `Bool` | `false` | Also match subdomains. |
| `expiresAt` | `String?` (yyyy-MM-dd) | — | Required. |
| `enforcementMode` | `EnforcementMode` | `.enforce` | `.enforce` or `.reportOnly`. |
| `enforceExpiry` | `Bool` | `false` | Block after `expiresAt` when true. |

### `AttestationConfiguration`

`init(attestUrl:protectedDomains:provider:coldStartPolicy:coldStartTimeout:challengeUrl:enrollUrl:)`.
`provider` is `AppAttestProvider` (platform attestation) or `DeviceKeyProvider`
(device-key enrollment); `challengeUrl`/`enrollUrl` are set together for the
latter. `coldStartPolicy` is `.queueThenFail` (default), `.monitor`, or
`.block`. Sign a request with `Youkey.attestation()?.sign(_:)`.

### `EncryptionConfiguration`

`init(serverKeyId:serverPublicKeySpkiB64:protectedDomains:failClosed:)`.
Encrypt a request with `Youkey.encryption()?.encrypt(_:)`, which returns the
encrypted request and a handle whose `openResponse(_:statusCode:)` decrypts the
response.
