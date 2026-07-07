---
title: Segnalazione delle violazioni
description: Recapito delle violazioni di sicurezza al callback dell'applicazione e a un endpoint di telemetria, con una coda persistente e cifrata.
---

Ogni evento di sicurezza viene recapitato in due modi: in modo sincrono al
callback `onViolation` e, facoltativamente, in batch a un endpoint di reporting
sul trasporto con pinning dell'SDK.

## Il callback onViolation

Il callback si attiva in modo sincrono per ogni violazione, bloccante o
consultiva, prima che la connessione venga interrotta. Instradalo verso i
sistemi di analytics o logging dell'applicazione:

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

Ogni violazione reca un `code` ([codici di violazione](/youkey-sdk-docs/it/reference/violation-codes/)),
il `domain`, un `timestamp` e un `debugDescription`.

## Reporting verso un endpoint

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

Gli eventi vengono raggruppati in batch e inviati all'intervallo configurato,
con retry a backoff esponenziale. Il trasporto è soggetto all'enforcement di
TLS e pinning dell'SDK stesso; l'endpoint deve usare `https://`.

## Coda persistente e cifrata

Gli eventi non recapitati sopravvivono alla terminazione del processo. Gli
eventi vengono conservati cifrati a riposo, tramite `EncryptedSharedPreferences`
con Android Keystore su Android e Data Protection su iOS, e vengono recapitati
all'avvio successivo. La coda è limitata con scarto dei più vecchi, e tutto
l'I/O su disco avviene fuori dai percorsi di richiesta e handshake. La
persistenza preserva le prove degli incidenti, come richiesto da normative
quali DORA.

`YoukeySDK.pendingViolationCount()` / `Youkey.pendingViolationCount()`
restituisce il numero di eventi in coda.

## Esempio end-to-end

L'esempio seguente abilita il reporting verso un endpoint insieme al callback,
configura i parametri di batch e interroga la coda in sospeso. `batchSize`
(1–100), `flushIntervalSeconds` (10–300) e `includeDeviceMetadata` si impostano
dentro il blocco `reporting`.

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
