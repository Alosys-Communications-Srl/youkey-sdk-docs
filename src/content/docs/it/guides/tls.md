---
title: Criteri su TLS e cifrari
description: Versione minima di TLS ed enforcement dei cifrari solo AEAD in YouKey SDK.
---

A ogni handshake l'SDK applica una versione minima di TLS e una allowlist di
suite di cifratura, in aggiunta al pinning dei certificati.

## Versione minima di TLS

`minTlsVersion` ha come valore predefinito TLS 1.2; imposta TLS 1.3 per
richiederlo. Un server che negozia un protocollo inferiore solleva un errore
bloccante `TLS_VERSION_TOO_LOW`.

```kotlin
// Android
minTlsVersion = TlsVersion.TLS_1_3
```
```swift
// iOS
.minTlsVersion(.tlsV13)
```

Con `TLS_1_2` l'SDK abilita `["TLSv1.3", "TLSv1.2"]`; con `TLS_1_3` solo
`["TLSv1.3"]`.

## Allowlist dei cifrari

L'SDK limita la negoziazione a un insieme fisso di suite di cifratura AEAD. Un
server che seleziona una suite fuori dall'allowlist solleva
`WEAK_CIPHER_SUITE`; il controllo si applica dove la suite negoziata è
osservabile. Le suite CBC e le altre suite non-AEAD vengono rifiutate.
L'allowlist non è configurabile.

## Meccanismo di enforcement

- **Android:** la `SSLSocketFactory` restituita da
  `YoukeySDK.sslSocketFactory()` imposta i protocolli e le suite di cifratura
  abilitati; il `SecurityTrustManager` convalida il protocollo e il cifrario
  negoziati durante l'handshake.
- **iOS:** `Youkey.sessionConfiguration()` applica la versione minima di TLS
  alla `URLSessionConfiguration`; il valutatore di trust convalida la
  connessione negoziata.

Entrambi vengono applicati quando il client HTTP è costruito come mostrato in
[Introduzione](/youkey-sdk-docs/it/get-started/).

## Osservazione delle violazioni TLS

Gli eventi relativi ai criteri TLS vengono recapitati a `onViolation`.
`TlsVersionTooLow` riporta il protocollo negoziato; `WeakCipherSuite` riporta la
suite di cifratura rifiutata.

```kotlin
// Android
import it.alosys.youkey.errors.SecurityViolation

onViolation { v ->
    when (v) {
        is SecurityViolation.TlsVersionTooLow ->
            Log.w("youkey", "${v.domain}: negotiated ${v.negotiatedProtocol} below the floor")
        is SecurityViolation.WeakCipherSuite ->
            Log.w("youkey", "${v.domain}: weak cipher ${v.cipher}")
        else -> Unit
    }
}
```

```swift
// iOS
.onViolation { v in
    switch v {
    case let .tlsVersionTooLow(domain, negotiatedVersion, _):
        print("\(domain): negotiated \(negotiatedVersion.protocolName) below the floor")
    case let .weakCipherSuite(domain, cipher, _):
        print("\(domain): weak cipher \(cipher)")
    default:
        break
    }
}
```
