---
title: Debug mode & production guard
description: Debug mode for local development, and the production guard that prevents it from being enabled in release builds.
---

Debug mode disables all enforcement (pinning, TLS and cipher policy, cleartext
blocking, attestation, and encryption) so that you can develop against a local
proxy or a staging server with a self-signed certificate.

```kotlin
// Android
debugMode = BuildConfig.DEBUG   // derived from the build type
```
```swift
// iOS
.debugMode(true)   // rejected in release builds; see below
```

When debug mode is enabled, every certificate chain is trusted, cleartext
traffic is allowed, reporting is suppressed, and attestation and encryption are
inactive.

## Production guard

`install()` invokes a production guard that rejects debug mode in a release
build:

- **Android:** the guard checks `BuildConfig.DEBUG`; enabling `debugMode` in a
  non-debuggable build causes `install()` to throw.
- **iOS:** the guard verifies that the build is not a release build.

A `debugMode = true` left in a release configuration therefore fails in CI or
at application launch, and cannot reach production. Derive the value from
`BuildConfig.DEBUG` on Android, or from a debug-only compilation condition on
iOS.
