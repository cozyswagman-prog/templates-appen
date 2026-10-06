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

## Filer

| Fil | Roll |
| --- | --- |
| `server/publisher.mjs` | Plattformsneutral kärna: publicera, återställa, visa, validera, minneslagring för tester |
| `server/worker.mjs` | Cloudflare Worker: R2- och D1-adaptrar, besöksdel och styrgränssnitt för lokala prov |
| `server/render-worker.mjs`, `server/worker-globals.mjs` | Appens oförändrade renderare och typsnitt i Workers |
| `server/schema.sql` | D1-tabellen `sites` |
| `tests/publisher.test.cjs` | Kärnan med riktig renderare: 6 tester |

Workern paketeras med esbuild (`.woff2` som binary, `.txt` som text, villkoret `worker`), som wrangler gör vid
driftsättning. Integrationsprovet i workerd (Miniflare, R2 och D1 simulerade) och i Chromium ligger i
`testmiljo/publicering-t06-20261006/` utanför källkoden.

## Gränser – inte klart för drift

- **Styrgränssnittet är bara för prov.** Publicering i drift ska gå via appens inloggade API, med kontroll av
  ägare, abonnemang och projektrevision (T07).
- **Bilder:** publiceringen tar emot projekt med inbäddade bilder. Hämtning från kontots privata lagring och
  Sharp-bildkontrollen (fungerar inte i Workers) återstår.
- **Kostnad och gränser:** rendering av en treaddig sajt kräver ungefär 13 ms processortid, vilket är mer än
  gratisplanens 10 ms. Workers Paid behövs.
- **En sidvisning mitt i en växling** kan hämta HTML från den nya versionen och en bild från den gamla, eftersom
  filnamnen är desamma mellan versioner. Versionsmärkta resursadresser löser det, men det är inte gjort.
- **Inte gjort:** egna domäner och HTTPS-certifikat (T08), borttagning av gamla versioner, övervakning och
  körning hos Cloudflare på riktigt.
