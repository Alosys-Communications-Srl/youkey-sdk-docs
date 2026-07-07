---
title: Aggiornamento dei pin da remoto (OTA)
description: Rotazione dei pin dei certificati senza una release dell'applicazione, tramite documenti firmati (schema v2/v3, ECDSA P-256).
---

I pin da remoto consentono di ruotare i pin dei certificati senza una release
dell'applicazione. L'SDK scarica un documento di pin JSON sul proprio trasporto
con pinning, avviato tramite un pin incluso in fase di compilazione per l'host
dei pin, e lo applica.

## Firma dei documenti

Ogni documento di pin da remoto reca una firma ECDSA P-256 (schema v2); non
esiste una modalità non firmata. L'SDK verifica la firma con chiavi pubbliche
incluse nell'applicazione in fase di compilazione prima di applicare il
documento. Un `remotePinConfig` privo di chiave di firma fallisce alla build
della configurazione; la compromissione dell'host dei pin non può quindi
compromettere il pinning.

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

Avvia un aggiornamento; la chiamata è bloccante su Android e asincrona su iOS:

```kotlin
val updated = YoukeySDK.refreshRemotePins()   // blocking; returns #domains updated
```
```swift
Youkey.refreshRemotePins { updated in /* … */ }
```

## Formato del documento

Il payload firmato è il JSON canonico RFC 8785 (JCS) del documento privato
dell'involucro `sig`:

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

Un documento scaricato viene rifiutato quando la firma è mancante, il `keyId` è
sconosciuto, `alg` non è `ES256`, la firma non è valida, la versione non è
superiore a quella in cache (anti-rollback) o il documento è scaduto. In caso di
rifiuto, i pin precedenti vengono mantenuti e viene emesso
`REMOTE_PIN_FETCH_FAILED`.

## Produzione dei documenti firmati

I documenti firmati vengono prodotti con lo strumento a riga di comando
`pin-signer` o con l'API `pinsign` del backend. La chiave privata resta offline
o in un HSM e non raggiunge l'host dei pin:

```sh
node tools/pin-signer/pin-signer.mjs keygen --key-id youkey-pin-2026-a
node tools/pin-signer/pin-signer.mjs sign --key <private> --key-id youkey-pin-2026-a pins.json --out pins-signed.json
```

## Hosting

Il documento di pin è un file JSON statico e l'SDK esegue esclusivamente una GET
HTTPS verso `url`. L'host dei pin può quindi essere una qualsiasi origine HTTPS
statica, come un object storage dietro una CDN o un web server statico; non è
richiesto alcun server applicativo. Il documento si produce e si firma
offline e l'hosting è un semplice caricamento di file.

Poiché l'SDK scarica il documento sul proprio trasporto con pinning,
`bootstrapPinHash` deve essere il pin SPKI dell'host che serve il documento.
Calcolalo dal certificato di quell'host:

```sh
openssl s_client -connect pins.example.com:443 2>/dev/null \
  | openssl x509 -pubkey -noout \
  | openssl pkey -pubin -outform der \
  | openssl dgst -sha256 -binary \
  | openssl enc -base64 | sed 's/^/sha256\//'
```

Puoi quindi valutare i pin da remoto senza infrastruttura lato server: firma il documento, caricalo su un host HTTPS statico, imposta `url` e
`bootstrapPinHash` e richiama `refreshRemotePins()`.

## Esempio end-to-end

L'esempio seguente configura il documento remoto all'installazione, con due
valori di `keyId` per una sovrapposizione di rotazione e un intervallo di
aggiornamento di 12 ore, avvia un aggiornamento fuori dal thread principale e
osserva i fallimenti di download. Un aggiornamento fallito è non bloccante e
mantiene i pin precedentemente applicati.

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

## Runbook di rotazione

1. Aggiungi un nuovo `keyId` (`…-b`) alla configurazione dell'applicazione e
   pubblica la release.
2. Pubblica un documento firmato con `…-b`.
3. Ritira `…-a` dalla release successiva dell'applicazione.

Poiché durante la sovrapposizione l'applicazione considera attendibili più
valori di `keyId`, non esiste alcun intervallo in cui la verifica fallisce.

## Schema v3 (chiavi di cifratura)

Lo schema v3 aggiunge un array firmato facoltativo `encryptionKeys` che
distribuisce, attraverso lo stesso documento, la chiave pubblica di
[cifratura del payload](/youkey-sdk-docs/it/guides/payload-encryption/). Un
documento v2 resta valido.
