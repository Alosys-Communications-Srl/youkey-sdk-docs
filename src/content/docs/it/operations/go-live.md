---
title: Checklist di go-live
description: Passi di prontezza alla produzione per il deployment di YouKey SDK; gestione delle chiavi, rollout graduale e runbook operativi.
---

## Configurazione

- [ ] `debugMode` è derivato dal tipo di build (`BuildConfig.DEBUG` su Android;
      una condizione di compilazione solo-debug su iOS) e non è mai impostato a
      `true` in modo fisso. La guardia di produzione rifiuta la modalità debug
      nelle build di release.
- [ ] `minTlsVersion` è impostato sul livello minimo previsto (TLS 1.2 o 1.3).
- [ ] `blockCleartext` è abilitato.
- [ ] Ogni dominio con pinning ha un pin primario e almeno uno di backup, e una
      data `expiresAt` allineata alla rotazione dei certificati.

## Chiavi

- [ ] La chiave privata di firma dei pin è custodita offline o in un HSM; solo
      le chiavi pubbliche sono incluse nell'applicazione. Sono configurati
      almeno due `keyId` per consentire la rotazione.
- [ ] Se si usa l'attestazione, la chiave di firma del token di sessione è
      custodita in un KMS (`KeySigner`), non in `LocalKeySigner`.
- [ ] Se si usa la cifratura del payload, la chiave privata di cifratura del
      server è custodita in un KMS; la chiave pubblica è distribuita tramite il
      documento di pin firmato (schema v3 `encryptionKeys`).

## Rollout graduale

Introduci l'enforcement in modo graduale anziché tutto in una volta:

1. **Pinning:** distribuisci i pin nuovi o ruotati in `REPORT_ONLY`, esamina la
   telemetria di `PIN_ROTATION_RECOMMENDED` e `CERTIFICATE_PINNING_FAILED` per
   confermare l'assenza di falsi positivi, e passa quindi a `ENFORCE`.
2. **Attestazione / firma:** esegui ogni route protetta in `monitor` sul
   backend, conferma che i client di produzione stiano attestando e firmando, e
   passa quindi la route a `enforce`. Sul client, seleziona il criterio di
   cold-start (`QUEUE_THEN_FAIL`, `MONITOR` o `BLOCK`).
3. **Cifratura del payload:** distribuisci la route in `monitor`, conferma che i
   client stiano cifrando, e passa quindi a `enforce`.

## Runbook

### Rotazione dei pin

Aggiungi un nuovo `keyId` di firma all'applicazione e pubblica la release;
pubblica un documento firmato con la nuova chiave; ritira la vecchia chiave
dalla release successiva dell'applicazione. Durante la sovrapposizione entrambe
le chiavi sono attendibili.

### Rotazione della chiave di cifratura

Distribuisci la nuova voce `encryptionKeys` tramite il documento di pin
firmato; commuta la chiave di decifratura attiva del backend; ritira la vecchia
chiave.

### Revoca del dispositivo (enrollment con chiave di dispositivo)

Revoca il dispositivo nel `DeviceKeyStore`; le attestazioni successive da quel
dispositivo vengono rifiutate.

### Modalità di fallimento

Un fallimento del download dei pin da remoto mantiene i pin precedenti ed
emette `REMOTE_PIN_FETCH_FAILED`. Un'interruzione del key-store del backend o
del fornitore di attestazione è contenuta dalla modalità `monitor` per route,
che può essere abilitata lato server senza un aggiornamento dell'applicazione.

## Telemetria

- [ ] `onViolation` è collegato al logging/analytics dell'applicazione.
- [ ] È configurato un endpoint di reporting (HTTPS) che riceve i batch.
- [ ] È confermato che la coda persistente delle violazioni venga svuotata dopo
      un riavvio del processo.
