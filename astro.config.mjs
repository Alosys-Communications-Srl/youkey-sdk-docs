// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// GitHub Pages: set `site` to the Pages origin and `base` to the repo name.
// Adjust both when the public docs repo / custom domain is finalized.
export default defineConfig({
  site: "https://alosys-communications-srl.github.io",
  base: "/youkey-sdk-docs",
  integrations: [
    starlight({
      title: "YouKey SDK",
      description:
        "Transport-security SDK for mobile banking apps: certificate pinning, TLS/cipher enforcement, cleartext blocking, signed OTA pin updates, two-sided attestation, and application-layer payload encryption.",
      logo: { src: "./src/assets/youkey-logo.png", alt: "YouKey" },
      favicon: "/favicon.png",
      // English is the default locale (served at the clean root); Italian is a
      // secondary locale under /it/. Untranslated pages fall back to English.
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        it: { label: "Italiano", lang: "it" },
      },
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      sidebar: [
        { label: "Overview", translations: { it: "Panoramica" }, link: "/" },
        { label: "Get started", translations: { it: "Introduzione" }, link: "/get-started/" },
        {
          label: "Guides",
          translations: { it: "Guide" },
          items: [
            { label: "Certificate pinning", translations: { it: "Pinning dei certificati" }, link: "/guides/pinning/" },
            { label: "Remote pin updates", translations: { it: "Aggiornamento pin da remoto" }, link: "/guides/remote-pins/" },
            { label: "TLS and cipher policy", translations: { it: "TLS e criteri sui cifrari" }, link: "/guides/tls/" },
            { label: "Cleartext blocking", translations: { it: "Blocco del traffico in chiaro" }, link: "/guides/cleartext/" },
            { label: "Attestation and request signing", translations: { it: "Attestazione e firma delle richieste" }, link: "/guides/attestation/" },
            { label: "Payload encryption", translations: { it: "Cifratura del payload" }, link: "/guides/payload-encryption/" },
            { label: "Violation reporting", translations: { it: "Segnalazione delle violazioni" }, link: "/guides/reporting/" },
            { label: "Debug mode and production guard", translations: { it: "Modalità debug e guardia di produzione" }, link: "/guides/debug-mode/" },
          ],
        },
        { label: "Backend integration", translations: { it: "Integrazione backend" }, link: "/backend/" },
        {
          label: "API reference",
          translations: { it: "Riferimento API" },
          items: [
            { label: "Android (Kotlin / Java)", link: "/reference/android/" },
            { label: "iOS (Swift)", link: "/reference/ios/" },
            { label: "Backend (Node / TypeScript)", link: "/reference/backend/" },
            { label: "Violation codes", translations: { it: "Codici di violazione" }, link: "/reference/violation-codes/" },
            { label: "Wire contract", translations: { it: "Contratto di trasmissione" }, link: "/reference/wire-contract/" },
          ],
        },
        {
          label: "Operations",
          translations: { it: "Operatività" },
          items: [
            { label: "Go-live checklist", translations: { it: "Checklist di go-live" }, link: "/operations/go-live/" },
          ],
        },
        { label: "Compliance", translations: { it: "Conformità" }, link: "/compliance/" },
      ],
    }),
  ],
});
