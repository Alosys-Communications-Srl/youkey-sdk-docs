---
title: Attestation & request signing
description: Per-request proof that a request originates from a genuine application instance, via Play Integrity, App Attest, or device-key enrollment without Google/Apple services.
---

## Purpose

Certificate pinning validates the identity of the server. Attestation validates
the identity of the client: it provides per-request proof that a request
originates from a genuine, attested application instance, enabling the backend
to reject traffic from any other source. It requires the
[backend SDK](/youkey-sdk-docs/reference/backend/) (`@alosys/youkey-server`).

## Model

```
Session start (background, once):  attest → { short-lived token, hmacSecret }
Per request (< 1 ms):              attach token + HMAC-SHA256(canonical request)
Before token expiry (background):  refresh; never blocks a request
```

Attestation runs once per session, outside the request path; per-request proof
is HMAC only. The client signs each request to a protected domain with four
headers: `X-Youkey-Token`, `X-Youkey-Timestamp`, `X-Youkey-Nonce`,
`X-Youkey-Signature`.

## Mechanisms

The SDK supports two attestation mechanisms: platform attestation, and
device-key enrollment without Google or Apple services. The selection criteria
are summarized in [Choosing a mechanism](#choosing-a-mechanism).

### Platform attestation (Play Integrity / App Attest)

The operating-system vendor attests to the integrity of the application and the
device.

```kotlin
// Android: add com.google.android.play:integrity to the app (compileOnly in the SDK)
attestation {
    attestUrl = "https://api.example.com/attest"
    provider = PlayIntegrityTokenProvider(context, cloudProjectNumber = 1234567890)
    protectDomain("api.example.com")
    coldStartPolicy = AttestationConfig.ColdStartPolicy.QUEUE_THEN_FAIL   // default
}
```
```swift
// iOS
let attestation = try AttestationConfiguration(
    attestUrl: "https://api.example.com/attest",
    protectedDomains: ["api.example.com"],
    provider: AppAttestProvider())          // DCAppAttestService-backed
```

### Device-key enrollment (no Google/Apple servers)

For deployments that must avoid a runtime dependency on Google or Apple
services. The application generates a hardware-backed key (Android Keystore,
iOS Secure Enclave) during your existing authenticated login, registers it, and
then proves possession by signing a server-issued challenge. Every call
is directed to the customer's backend.

```kotlin
// Android
attestation {
    attestUrl    = "https://api.example.com/attest"
    challengeUrl = "https://api.example.com/challenge"
    enrollUrl    = "https://api.example.com/enroll"   // mount behind your login auth
    provider     = DeviceKeyProvider(KeystoreDeviceKey())
    protectDomain("api.example.com")
}
// Register once, inside an authenticated session:
YoukeySDK.attestation()?.enroll(authorization = myBankSessionToken) { /* deviceId */ }
```
```swift
// iOS
let attestation = try AttestationConfiguration(
    attestUrl: "https://api.example.com/attest",
    protectedDomains: ["api.example.com"],
    provider: DeviceKeyProvider(deviceKey: SecureEnclaveDeviceKey()),
    challengeUrl: "https://api.example.com/challenge",
    enrollUrl: "https://api.example.com/enroll")
Youkey.attestation()?.enroll(authorization: myBankSessionToken) { /* deviceId */ }
```

### Choosing a mechanism

Device-key enrollment proves that the request originates from the enrolled
device, whose key is hardware-backed and non-exportable, but does not attest
that the application binary is unmodified; binary integrity is the domain of
code-protection tooling. Platform attestation asserts binary and device
integrity but depends on Google and Apple services.

## Signing integration

- **Android:** requests to protected domains sent through
  `YoukeySDK.okHttpInterceptor()` are signed automatically.
- **iOS:** `URLSession` provides no interceptor chain; sign requests
  explicitly: `request = try Youkey.attestation()!.sign(request)`.

## Cold-start policy

The cold-start policy determines how a protected request is handled before a
session exists:

- `QUEUE_THEN_FAIL` (default): the request waits up to the timeout, then fails
  closed.
- `MONITOR`: the request proceeds unsigned and a diagnostic is emitted (for
  staged rollout).
- `BLOCK`: the request fails closed immediately.

On the backend, run each protected route in `monitor` mode, review the
telemetry, and then switch the route to `enforce`.
