# Publicering av kundsajter – lokal prototyp (T06)

Förberett 2026-10-06. Ingen sajt är publicerad på internet. Inget Cloudflare-konto är skapat eller anslutet.

## Vad det gör

```text
projekt (validerat) ──render──▶ filer ──▶ R2: sites/<sajt>/v/<ny version>/…  (oföränderlig)
                                              │  varje fil kontrolleras (storlek + SHA-256)
                                              ▼
                               D1: sites.active_version ◀── växlas med jämför-och-byt på revision
                                              │
besökare ─▶ kundens värdnamn ─▶ aktiv version ─▶ fil (bara filnamn som exporten själv skapar)
```

- **Utkast är privata.** Besökare når bara den aktiva versionen. Versionen tas aldrig från adressen, så
  inaktiva versioner, manifest och andra sajter går inte att nå.
- **Ett avbrutet jobb ändrar ingenting.** Allt skrivs under ett nytt prefix och kontrolleras innan pekaren
  växlas. Om något fel uppstår före växlingen visas föregående version oförändrad.
- **Samtidiga jobb blandas aldrig.** Varje jobb har eget prefix, och växlingen är en enda D1-UPDATE med
  villkor på revisionen. Två flikar som utgår från samma revision får en vinnare och en konflikt.
- **Återställning** pekar om till en tidigare version efter att alla dess filer har kontrollerats.
- **Säkerhetsrubriker:** CSP (bara egna filer, inbäddade bilder och Formspree för formulär),
  `nosniff`, `Referrer-Policy` och `X-Frame-Options: DENY`.
- **Cache:** `ETag` från SHA-256 och `must-revalidate`, så att en ny version syns direkt.
- **Projektet valideras före rendering:** känd mall, bara textfält, och bilder bara som inbäddad
  PNG/JPEG/WebP/GIF (SVG och bildreferenser till kontot avvisas). Kundtext publiceras som text.

## Publicering med kundens inloggning

`POST https://<PUBLISH_HOST>/api/publish` med `{ siteId, projectId, expectedRevision? }` och kundens
Supabase-token i `Authorization`:

1. Bara appens origin (`APP_ORIGIN`) får anropa. Svar på preflight ges bara till den.
2. Workern kontrollerar inloggningen hos Supabase (`/auth/v1/user`).
3. Bara sajtens ägare (`sites.owner_id`) får publicera. Okänd sajt och annans sajt ger samma 404.
4. Projektet hämtas med **kundens egen token**, så RLS ger bara egna rader. Bilderna hämtas från kontots
   privata lagring på samma sätt och kontrolleras mot sin innehållsnyckel. Workern har bara den publika
   nyckeln. Ingen hemlig nyckel behövs, och den avvisas.
5. Därefter samma versionsflöde som ovan. `expectedRevision` skyddar mot två flikar.

`REQUIRE_PLAN='1'` nekar all publicering (402) tills abonnemangskontrollen finns (T07). Kontrollen
av vem som får skapa en sajt med en viss ägare och ett visst värdnamn finns inte heller ännu. Styrgränssnittet
gör det i prov, men ska inte vara konfigurerat i drift.

## Filer

| Fil | Roll |
| --- | --- |
| `server/publisher.mjs` | Plattformsneutral kärna: publicera, återställa, visa, validera, minneslagring för tester |
| `server/worker.mjs` | Cloudflare Worker: R2- och D1-adaptrar, besöksdel, `/api/publish` och styrgränssnitt för lokala prov |
| `server/publish-api.mjs` | Det inloggade publicerings-API:t: ursprung, inloggning, ägare, felkoder |
| `server/account-source.mjs` | Hämtar projekt och bilder från Supabase med kundens token och bildkontroll |
| `server/render-worker.mjs`, `server/worker-globals.mjs` | Appens oförändrade renderare och typsnitt i Workers |
| `server/schema.sql` | D1-tabellen `sites` |
| `tests/publisher.test.cjs` | Kärnan med riktig renderare: 6 tester |
| `tests/publish-api.test.cjs` | API:t mot simulerad Supabase med RLS-beteende: 5 tester |

Workern paketeras med esbuild (`.woff2` som binary, `.txt` som text, villkoret `worker`), som wrangler gör vid
driftsättning. Integrationsprovet i workerd (Miniflare, R2 och D1 simulerade) och i Chromium ligger i
`testmiljo/publicering-t06-20261006/` utanför källkoden.

## Gränser – inte klart för drift

- **Abonnemang (T07)** och **skapande av sajt med ägare och värdnamn** är inte byggda. Styrgränssnittet är bara för prov.
- **Appen har ingen Publicera-knapp än.** API:t är provat med simulerad Supabase, inte med riktiga konton.
- **Bildkontroll:** varje bild kontrolleras mot sin innehållsnyckel, MIME-typ och storlek. Sharp-omkodningen
  (metadata, orientering, max 1600 px) fungerar inte i Workers och återstår.
- **Kostnad och gränser:** rendering av en tresidig sajt kräver ungefär 13 ms processortid, vilket är mer än
  gratisplanens 10 ms. Workers Paid behövs.
- **En sidvisning mitt i en växling** kan hämta HTML från den nya versionen och en bild från den gamla, eftersom
  filnamnen är desamma mellan versioner. Versionsmärkta resursadresser löser det, men det är inte gjort.
- **Inte gjort:** egna domäner och HTTPS-certifikat (T08), borttagning av gamla versioner, övervakning och
  körning hos Cloudflare på riktigt.
