# Memoraq — Product Requirements (as built in this iteration)

## What
Memoraq is a private, offline-first customer-memory and archive app for small businesses and independent professionals. It turns WhatsApp exported chat text/zip files into a searchable local archive with notes, tags, follow-ups and a portable Rescue Pack.

Core promise: **Your WhatsApp account is not a business database. Memoraq protects the customer history your business depends on.**

## Platform
- Expo React Native app (TypeScript, SDK 57).
- Target: Android (bundle id `com.blackbox`, display name "Memoraq"). iOS compatible.
- The spec requested native Kotlin; this build delivers an equivalent in Expo with the same product, data model and feature coverage. Share-sheet intent registration and Google Play Billing are abstracted and must be completed in a native/dev-client build.

## Shipped in this iteration
### Onboarding (4 screens, skippable)
### Tabs: Customers / Search / Follow Ups / Settings
### Customer Detail with Conversation / Notes / Attachments / Activity
### Add Customer / Importer (TXT, ZIP, paste)
### WhatsApp parser (Unicode, 12/24h, multi-line, system, media)
### ZIP support with zip-slip guard + attachment store
### SQLite data layer (expo-sqlite) with 10 tables + indexes
### Rescue Pack: ZIP with CSVs, manifest, README and offline HTML viewer
### Follow-ups + expo-notifications abstraction
### Pro/billing mock scaffold (pro_lifetime_unlock placeholder)
### Privacy screen, About, Delete Everything, Sample data loader
### Light + Dark Material-You theme from `design_guidelines.json`

## Known limitations
- Android Sharesheet intent filter declared; URI intake needs native/dev client.
- Google Play Billing mocked; interface wired.
- expo-sqlite web preview falls back to empty via 1.5s timeout; Android persists fully.

## Next steps
1. Dev client build to validate Share Sheet intent handling.
2. Wire real Google Play Billing (`pro_lifetime_unlock`).
3. Add SQLite FTS5 for very-large archives.
4. Optional biometric lock on cold start.
