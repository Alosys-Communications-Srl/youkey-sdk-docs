---
title: Go-live checklist
description: "Production-readiness steps for deploying the YouKey SDK: key management, staged rollout, and operational runbooks."
---

## Configuration

- [ ] `debugMode` is driven from the build type (`BuildConfig.DEBUG` on Android;
      a debug-only compilation condition on iOS) and is never hardcoded `true`.
      The production guard rejects debug mode in release builds.
- [ ] `minTlsVersion` is set to the intended floor (TLS 1.2 or 1.3).
- [ ] `blockCleartext` is enabled.
- [ ] Every pinned domain has a primary and at least one backup pin, and an
      `expiresAt` date aligned with certificate rotation.

## Keys

- [ ] The pin-signing private key is held offline or in an HSM; only public
      keys are compiled into the application. At least two `keyId`s are
      configured to allow rotation.
- [ ] If attestation is used, the session-token signing key is held in KMS
      (`KeySigner`), not `LocalKeySigner`.
- [ ] If payload encryption is used, the server encryption private key is held
      in KMS; the public key is distributed via the signed pin document
      (schema v3 `encryptionKeys`).

## Staged rollout

Introduce enforcement gradually rather than all at once:

1. **Pinning:** deploy new or rotated pins in `REPORT_ONLY`, review the
   `PIN_ROTATION_RECOMMENDED` and `CERTIFICATE_PINNING_FAILED` telemetry to
   confirm the absence of false positives, and then switch to `ENFORCE`.
2. **Attestation / signing:** run each protected route in `monitor` on the
   backend, confirm that production clients are attesting and signing, and then
   switch the route to `enforce`. On the client, select the cold-start policy
   (`QUEUE_THEN_FAIL`, `MONITOR`, or `BLOCK`).
3. **Payload encryption:** deploy the route in `monitor`, confirm that clients
   are encrypting, and then switch to `enforce`.

## Runbooks

### Pin rotation

Add a new signing `keyId` to the application and ship it; publish a document
signed with the new key; retire the old key from the next application release.
During the overlap both keys are trusted.

### Encryption key rotation

Ship the new `encryptionKeys` entry via the signed pin document; switch the
backend's active decryption key; retire the old key.

### Device revocation (device-key enrollment)

Revoke the device in the `DeviceKeyStore`; subsequent attestations from that
device are rejected.

### Failure modes

A remote-pin fetch failure retains the previous pins and emits
`REMOTE_PIN_FETCH_FAILED`. A backend key-store or attestation-provider outage
is contained by per-route `monitor` mode, which can be enabled server-side
without an application update.

## Telemetry

- [ ] `onViolation` is wired to the application's logging/analytics.
- [ ] A reporting endpoint is configured (HTTPS) and receiving batches.
- [ ] The persistent violation queue is confirmed to flush after a
      process restart.
