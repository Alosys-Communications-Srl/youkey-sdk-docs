---
title: Pinning dei certificati
description: Pinning SPKI dei certificati in YouKey SDK; pin primari e di backup, sottodomini, wildcard, modalità di enforcement e scadenza fail-closed.
---

YouKey applica il pinning dello SHA-256 del **SubjectPublicKeyInfo (SPKI)** dei
certificati nella catena del server (certificate pinning). Un pin è la stringa
`sha256/<base64(SHA-256(SPKI DER))>`. Il pinning viene applicato in aggiunta
alla validazione della CA di piattaforma; una connessione deve superare
entrambe.

## Il modello dei pin

Per ciascun dominio si configura un elenco ordinato di pin:

- Il primo pin è il **primario**, del quale ci si attende la corrispondenza a
  ogni connessione.
- I pin restanti sono **di backup**, tenuti di riserva per una rotazione senza
  interruzioni.

OWASP richiede almeno un pin primario e uno di backup; l'SDK richiede pertanto
almeno due pin per dominio, e in caso contrario la build della configurazione
fallisce. La corrispondenza valuta l'intera catena (foglia, intermedi e
radice):

- La corrispondenza del primario ha esito positivo e non emette alcun evento.
- La corrispondenza del solo backup ha esito positivo ed emette un evento non
  bloccante `PIN_ROTATION_RECOMMENDED`, che indica che il pin primario va
  ruotato.
- L'assenza di corrispondenza solleva `CERTIFICATE_PINNING_FAILED`, che in
  modalità `ENFORCE` blocca la connessione.

## Configurazione dei pin

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

### Corrispondenza dei domini

- **Esatta:** `api.example.com` corrisponde solo a quell'host.
- **Sottodomini:** l'impostazione `includeSubdomains = true` estende la
  corrispondenza a `*.api.example.com`.
- **Wildcard:** un dominio scritto come `*.example.com` corrisponde ai propri
  sottodomini e al dominio base `example.com`. Un suffisso senza confine di
  punto non corrisponde; `evilexample.com` non corrisponde a `*.example.com`.

## Modalità di enforcement

- `ENFORCE` (predefinita): il fallimento di un pin interrompe la connessione.
- `REPORT_ONLY`: la violazione viene recapitata al callback e al reporting, e la
  richiesta prosegue. Questa modalità supporta il rollout graduale: esamina la
  telemetria, conferma che non vi siano falsi positivi e passa quindi a `ENFORCE`.

## Scadenza dei pin

`expiresAt` produce un `PIN_EXPIRY_WARNING` non bloccante a partire da
`pinExpiryWarningDays` (predefinito 30) giorni prima della data, e continuando
oltre di essa.

Imposta `enforceExpiry = true` per rendere la scadenza fail-closed: dopo
`expiresAt`, la connessione viene bloccata con `CERTIFICATE_PINNING_FAILED`
anche se il pin corrisponde ancora. Il valore predefinito è `false`, nel qual
caso la scadenza produce esclusivamente avvisi; abilita l'enforcement per
dominio quando il processo di rotazione dei certificati è consolidato. Su
entrambe le piattaforme l'enforcement inizia il giorno successivo a
`expiresAt`; il pin resta valido per l'intero giorno di scadenza.

## Calcolo di un pin

Il pin è lo SHA-256, codificato in base64, dell'SPKI DER del certificato.
Calcolalo da un file di certificato oppure direttamente da un server live.

#### Da un file di certificato

```sh
openssl x509 -in cert.pem -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
# → prefix with "sha256/"
```

#### Da un server live

```sh
openssl s_client -connect api.example.com:443 -servername api.example.com </dev/null 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64
# → prefix with "sha256/"
```

Applica il pinning alla chiave pubblica (SPKI) e non al certificato; il pin
resta così valido attraverso i rinnovi del certificato finché la chiave viene
riutilizzata.

## Varianti di configurazione

#### Rollout graduale

Distribuisci i pin nuovi o ruotati in `REPORT_ONLY`, conferma dalla telemetria
che non vi siano falsi positivi e passa quindi a `ENFORCE`.

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

#### Scadenza fail-closed con una finestra di avviso più lunga

`pinExpiryWarningDays` è un'impostazione di primo livello (predefinito 30);
`enforceExpiry` è per dominio.

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

#### Domini multipli e sottodomini

Configura un blocco `pin` per ciascun dominio; imposta `includeSubdomains` per
coprire i sottodomini.

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

## Esempio end-to-end

Un'integrazione completa installa l'SDK all'avvio del processo, costruisce il
client HTTP dai componenti dell'SDK, esegue una richiesta e gestisce le
violazioni. Ogni evento, bloccante o consultivo,
viene recapitato in modo sincrono a `onViolation`; le due categorie si
distinguono con `code.blocksConnection`. Su Android una violazione bloccante
interrompe inoltre la chiamata con una `SecurityViolationException`, che è una
`IOException`.

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
