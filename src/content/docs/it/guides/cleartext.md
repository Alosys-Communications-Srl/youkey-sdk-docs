---
title: Blocco del traffico in chiaro
description: Rifiuto del traffico http:// prima dell'apertura del socket in YouKey SDK.
---

Con `blockCleartext = true` (valore predefinito), qualsiasi richiesta `http://`
o comunque non-TLS viene rifiutata prima che venga aperto un socket, sollevando
`CLEARTEXT_NOT_PERMITTED`. Le richieste `https://` e `wss://` sono consentite.

```kotlin
// Android: default true
blockCleartext = true
```
```swift
// iOS: default true
.blockCleartext(true)
```

Questo controllo è la componente a runtime della protezione dal traffico in
chiaro (cleartext):

- **Android:** l'interceptor OkHttp e l'hook su `HttpsURLConnection` controllano
  lo schema dell'URL, recapitano la violazione in modo sincrono al callback e
  sollevano una `SecurityViolationException` (una `IOException`). Abbina il
  controllo a runtime a un `network-security-config` nel manifest come
  componente statica.
- **iOS:** il delegate `URLSession` dell'SDK blocca il traffico in chiaro.
  Abbina il controllo a runtime ad App Transport Security
  (`NSAppTransportSecurity`) come componente statica.

Mantieni il blocco del traffico in chiaro attivo in produzione. Viene
disabilitato automaticamente in
[modalità debug](/youkey-sdk-docs/it/guides/debug-mode/).

## Esempio end-to-end

Una richiesta `http://` viene rifiutata prima che venga aperto un socket,
sollevando `CLEARTEXT_NOT_PERMITTED`. Su Android la chiamata bloccata solleva
una `SecurityViolationException` (una `IOException`); su iOS la richiesta viene
annullata con un `URLError` e la violazione tipizzata viene recapitata a
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
