---
title: Cifratura del payload
description: Cifratura a livello applicativo dei corpi di richiesta e risposta al di sotto di TLS, tramite HPKE (RFC 9180).
---

## Scopo

La cifratura del payload a livello applicativo (ALPE, application-layer payload
encryption) cifra il corpo di richiesta e risposta end-to-end tra il processo
dell'applicazione e il livello applicativo del cliente, al di sotto di TLS.
Protegge il contenuto del corpo dagli intermediari che terminano TLS (nodi edge
delle CDN, load balancer, web application firewall e reverse proxy), i quali con
il solo TLS osservano il testo in chiaro.

ALPE è una misura di difesa in profondità. Non sostituisce TLS (metadati della
richiesta, header, dimensione e temporizzazione restano protetti dal solo TLS)
e non sostituisce l'[attestazione](/youkey-sdk-docs/it/guides/attestation/), che
autentica il client. È facoltativa e additiva; le applicazioni che non la
configurano non ne sono influenzate.

## Crittografia

ALPE usa HPKE (RFC 9180) in modalità base con la ciphersuite
`DHKEM(P-256, HKDF-SHA256) / HKDF-SHA256 / AES-256-GCM`. Ogni corpo di richiesta
viene sigillato verso la chiave pubblica statica del server con una nuova chiave
effimera (single-shot; nessun handshake e nessuno stato server per sessione). La
risposta è cifrata con AES-256-GCM sotto una chiave derivata dal segreto
exporter dello stesso contesto HPKE, quindi le risposte non richiedono una
seconda incapsulazione di chiave.

L'implementazione è validata rispetto a vettori di test pubblicati della RFC
9180 ed è identica byte per byte tra gli SDK Android, iOS e backend.

## Configurazione

La chiave pubblica del server è inclusa nell'applicazione e, in produzione,
ruotata attraverso il documento di pin firmato (schema v3 `encryptionKeys`).

```kotlin
// Android
encryption {
    serverKeyId = "enc-2026-a"
    serverPublicKeySpkiBase64 = "<base64 SPKI DER of the server P-256 key>"
    protectDomain("api.example.com")
    failClosed = true   // default
}
```

```swift
// iOS
.encryption(try EncryptionConfiguration(
    serverKeyId: "enc-2026-a",
    serverPublicKeySpkiB64: "<base64 SPKI DER of the server P-256 key>",
    protectedDomains: ["api.example.com"]))
```

## Integrazione lato client

- **Android:** le richieste verso un dominio protetto inviate tramite
  `YoukeySDK.okHttpInterceptor()` hanno il corpo sigillato automaticamente e la
  risposta cifrata viene decifrata in modo trasparente. Quando è abilitata anche
  la firma delle richieste, la firma è calcolata sul testo in chiaro prima della
  cifratura.
- **iOS:** `URLSession` non fornisce una catena di interceptor; cifra in modo
  esplicito e decifra la risposta con l'handle restituito:

  ```swift
  let (encrypted, handle) = try Youkey.encryption()!.encrypt(request)
  let (data, response) = try await session.data(for: encrypted)
  let plaintext = try handle!.openResponse(
      data, statusCode: (response as! HTTPURLResponse).statusCode)
  ```

## Formato di trasmissione

Una richiesta protetta reca l'header `X-Youkey-Enc: v1; keyId=<keyId>` e un
corpo `enc_len(2) ‖ enc ‖ ciphertext`, dove `enc` è la chiave incapsulata HPKE e
i dati associati (associated data) dell'AEAD legano il testo cifrato al metodo e
al percorso della richiesta. La specifica completa è nel
[contratto di trasmissione](/youkey-sdk-docs/it/reference/wire-contract/).

## Criterio di fallimento

Quando una richiesta protetta non può essere cifrata (per esempio un corpo di
richiesta in streaming, che non può essere sottoposto ad hash), si applica il
criterio configurato:

- `failClosed = true` (predefinito): la richiesta viene bloccata.
- `failClosed = false`: la richiesta prosegue non cifrata e viene emessa una
  diagnostica `CONFIGURATION_WARNING` (solo per il rollout graduale).

## Verifica

1. Invia una richiesta verso un dominio protetto, catturala a livello di rete e
   conferma che il corpo sia testo cifrato.
2. Conferma che il server decifri la richiesta e che la risposta venga
   restituita cifrata e decifrata in modo trasparente dal client.
3. Altera il metodo o il percorso della richiesta in transito e conferma che la
   decifratura fallisca (legame con i dati associati).
