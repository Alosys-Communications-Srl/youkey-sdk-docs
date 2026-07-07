---
title: Conformità
description: Copertura OWASP MASVS-NETWORK fornita da YouKey SDK.
---

YouKey SDK fornisce controlli allineati all'OWASP Mobile Application Security
Verification Standard (MASVS), categoria NETWORK, e aggiunge controlli oltre a
tali requisiti.

## Copertura MASVS-NETWORK

| Requisito | Copertura |
|---|---|
| **MASVS-NETWORK-1**: Comunicazione di rete sicura (canali cifrati, configurazione TLS) | Versione minima di TLS configurabile (1.2 o 1.3); allowlist fissa di cifrari solo AEAD applicata a ogni handshake; traffico in chiaro (`http://`) bloccato prima dell'apertura della connessione; validazione della catena di certificati di piattaforma mantenuta in aggiunta al pinning. |
| **MASVS-NETWORK-2**: Pinning della chiave pubblica/del certificato | Pinning SPKI SHA-256 sull'intera catena di certificati, con pin primari e di backup; enforce/report-only per dominio; scadenza fail-closed facoltativa; rotazione dei pin fuori banda tramite documenti firmati con ECDSA e verificati con chiavi incluse in fase di compilazione. |

## Controlli aggiuntivi oltre MASVS-NETWORK

- **Attestazione delle richieste:** prova, per ogni richiesta, che il traffico
  provenga da un'istanza dell'applicazione autentica e attestata (attestazione
  di piattaforma o enrollment con chiave hardware) con verifica lato server.
- **Cifratura del payload a livello applicativo:** cifratura HPKE (RFC 9180)
  dei corpi di richiesta e risposta al di sotto di TLS, che protegge il
  contenuto dagli intermediari che terminano TLS.
- **Segnalazione delle violazioni a prova di manomissione:** recapito sincrono
  tramite callback più reporting in batch verso un endpoint, con gli eventi non
  recapitati conservati cifrati a riposo come prova degli incidenti.
