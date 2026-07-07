---
title: Attestazione e firma delle richieste
description: Prova, per ogni richiesta, che essa provenga da un'istanza autentica dell'applicazione, tramite Play Integrity, App Attest o enrollment con chiave di dispositivo senza servizi Google/Apple.
---

## Scopo

Il pinning dei certificati valida l'identità del server. L'attestazione
(attestation) valida l'identità del client: fornisce, per ogni richiesta, la
prova che essa provenga da un'istanza dell'applicazione autentica e attestata,
consentendo al backend di rifiutare il traffico proveniente da qualsiasi altra
origine. Richiede l'[SDK backend](/youkey-sdk-docs/it/reference/backend/)
(`@alosys/youkey-server`).

## Modello

```
Session start (background, once):  attest → { short-lived token, hmacSecret }
Per request (< 1 ms):              attach token + HMAC-SHA256(canonical request)
Before token expiry (background):  refresh; never blocks a request
```

L'attestazione viene eseguita una volta per sessione, fuori dal percorso delle
richieste; la prova per ogni richiesta è esclusivamente HMAC. Il client firma
ogni richiesta verso un dominio protetto con quattro header: `X-Youkey-Token`,
`X-Youkey-Timestamp`, `X-Youkey-Nonce`, `X-Youkey-Signature`.

## Meccanismi

L'SDK supporta due meccanismi di attestazione: l'attestazione di piattaforma e
l'enrollment con chiave di dispositivo senza servizi Google o Apple. I criteri
di scelta sono riepilogati in [Scelta del meccanismo](#scelta-del-meccanismo).

### Attestazione di piattaforma (Play Integrity / App Attest)

Il fornitore del sistema operativo attesta l'integrità dell'applicazione e del
dispositivo.

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

### Enrollment con chiave di dispositivo (senza server Google/Apple)

Per i deployment che devono evitare una dipendenza runtime dai servizi Google o
Apple. L'applicazione genera una chiave con backing hardware (Android Keystore,
iOS Secure Enclave) durante il login autenticato esistente, la registra e poi
ne dimostra il possesso firmando una sfida (challenge) emessa dal
server. Ogni chiamata è diretta al backend del cliente.

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

### Scelta del meccanismo

L'enrollment con chiave di dispositivo dimostra che la richiesta proviene dal
dispositivo registrato, la cui chiave ha backing hardware e non è esportabile,
ma non attesta che il binario dell'applicazione sia inalterato; l'integrità del
binario è di competenza degli strumenti di protezione del codice.
L'attestazione di piattaforma asserisce l'integrità di binario e dispositivo,
ma dipende dai servizi Google e Apple.

## Integrazione della firma

- **Android:** le richieste verso domini protetti inviate tramite
  `YoukeySDK.okHttpInterceptor()` vengono firmate automaticamente.
- **iOS:** `URLSession` non fornisce una catena di interceptor; firma le
  richieste in modo esplicito: `request = try Youkey.attestation()!.sign(request)`.

## Criterio di cold-start

Il criterio di cold-start determina come viene gestita una richiesta protetta
emessa prima che esista una sessione:

- `QUEUE_THEN_FAIL` (predefinito): la richiesta attende fino al timeout, poi
  fallisce fail-closed.
- `MONITOR`: la richiesta prosegue non firmata e viene emessa una diagnostica
  (per il rollout graduale).
- `BLOCK`: la richiesta fallisce fail-closed immediatamente.

Sul backend, esegui ogni route protetta in modalità `monitor`, esamina la
telemetria e passa quindi la route a `enforce`.
