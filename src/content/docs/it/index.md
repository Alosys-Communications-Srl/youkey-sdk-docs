---
title: Panoramica
description: Documentazione tecnica di YouKey Security SDK, un SDK di sicurezza per applicazioni mobili Android e iOS che copre la sicurezza del trasporto, l'attestazione delle richieste e la cifratura del payload, con un SDK backend complementare.
---

YouKey Security SDK è un SDK di sicurezza per applicazioni mobili che copre tre
livelli: la sicurezza del trasporto (pinning dei certificati, criteri su TLS e
cifrari, blocco del traffico in chiaro), l'attestazione delle richieste (la
prova che ogni richiesta provenga da un'istanza dell'applicazione autentica e
attestata) e la cifratura del payload a livello applicativo. Un SDK backend
complementare implementa il lato server dei protocolli di attestazione e
cifratura.

È un SDK nativo, privo di dipendenze runtime di terze parti: l'SDK Android usa
`android.*`, `javax.*`, `java.security.*` e AndroidX `security-crypto`; l'SDK
iOS usa `Security`, `CryptoKit` e `Foundation`; l'SDK backend usa esclusivamente
la libreria standard di Node.js.

## Funzionalità

| Funzionalità | Sintesi |
|---|---|
| Pinning dei certificati (certificate pinning) | Pinning SPKI SHA-256 sull'intera catena di certificati, con pin primari e di backup ed enforcement per dominio. |
| Criteri su TLS e cifrari | Versione minima di TLS configurabile e allowlist fissa di cifrari solo AEAD, applicate a ogni handshake. |
| Blocco del traffico in chiaro (cleartext) | Le richieste non-TLS vengono rifiutate prima dell'apertura della connessione. |
| Aggiornamento dei pin da remoto | I pin dei certificati vengono ruotati fuori banda tramite documenti firmati con ECDSA e verificati con chiavi incluse in fase di compilazione. |
| Segnalazione delle violazioni | Gli eventi di sicurezza vengono recapitati a un callback dell'applicazione e, facoltativamente, inviati in batch a un endpoint di reporting; gli eventi non recapitati vengono conservati cifrati a riposo. |
| Attestazione e firma delle richieste | Prova, per ogni richiesta, che essa provenga da un'istanza dell'applicazione attestata, tramite attestazione di piattaforma o enrollment con chiave hardware. |
| Cifratura del payload | Cifratura facoltativa, a livello applicativo, dei corpi di richiesta e risposta al di sotto di TLS, tramite HPKE (RFC 9180). |

## Standard

L'SDK soddisfa i requisiti MASVS-NETWORK-1 (comunicazione di rete sicura) e
MASVS-NETWORK-2 (pinning della chiave pubblica) e fornisce controlli aggiuntivi
oltre a tali requisiti.

## Distribuzione

| Componente | Coordinata | Linguaggio |
|---|---|---|
| SDK Android | `it.alosys:youkey-sdk` (Maven) | Kotlin / Java |
| SDK iOS | XCFramework (Swift Package Manager) | Swift |
| SDK backend | `@alosys/youkey-server` (npm) | TypeScript / Node.js |

Gli SDK mobili e l'SDK backend implementano contratti di trasmissione (wire
contract) identici, verificati da una suite di test di conformità
multilinguaggio.

## Struttura della documentazione

- [Introduzione](/youkey-sdk-docs/it/get-started/): installazione e
  configurazione iniziale per Android e iOS.
- Guide: riferimento orientato ai compiti per ciascuna funzionalità.
- Riferimento API: l'API pubblica di ciascun SDK e i codici di violazione
  enumerati.
- Conformità: copertura MASVS-NETWORK.
