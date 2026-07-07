---
title: Modalità debug e guardia di produzione
description: La modalità debug per lo sviluppo locale e la guardia di produzione che ne impedisce l'attivazione nelle build di release.
---

La modalità debug (debug mode) disabilita tutto l'enforcement (pinning, criteri
su TLS e cifrari, blocco del traffico in chiaro, attestazione e cifratura) così da poter
sviluppare contro un proxy locale o un server di staging con certificato
autofirmato.

```kotlin
// Android
debugMode = BuildConfig.DEBUG   // derived from the build type
```
```swift
// iOS
.debugMode(true)   // rejected in release builds; see below
```

Quando la modalità debug è attiva, ogni catena di certificati è considerata
attendibile, il traffico in chiaro è consentito, il reporting è soppresso e
attestazione e cifratura sono inattive.

## Guardia di produzione

`install()` richiama una guardia di produzione che rifiuta la modalità debug in
una build di release:

- **Android:** la guardia controlla `BuildConfig.DEBUG`; l'attivazione di
  `debugMode` in una build non debuggabile provoca un'eccezione in `install()`.
- **iOS:** la guardia verifica che la build non sia una build di release.

Un `debugMode = true` lasciato in una configurazione di release fallisce quindi
nella CI o all'avvio dell'applicazione e non può raggiungere la produzione.
Deriva il valore da `BuildConfig.DEBUG` su Android o da una condizione di
compilazione solo-debug su iOS.
