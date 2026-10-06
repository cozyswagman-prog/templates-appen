# Releasegranskning av QA-grenen, 2026-10-06

**Bedömning: QA-arbetet kan fortsätta, men hela produkten är inte verifierad för betald pilot.**
Det riktiga abonnemangsprovet har hoppats över på ägarens begäran. En uppgiven lyckad
fakturabetalning på 50 kr behandlas som ett separat prov, inte som bevis för Templates
abonnemang, webhook, publiceringsrätt eller uppsägning.

## Jämförelse med main

`origin/main` hämtades inför granskningen: `ebabaac34970bdd8266687fb8141a45c19e8ad14`.
QA-grenen är `qa/mobile-usability-20261002`. Ändringarna sedan main omfattar:

- redigerbara företagsfunktioner i nio mallar samt sparande och konflikthantering,
- Supabase-konton, privata projekt/bilder, RLS, bildlivscykel och lokala backupprov,
- kundstyrd publicering, D1/R2-lagring, versioner och återställning,
- Stripe Checkout, kundportal, signerade händelser och abonnemangsrätt,
- workers.dev-adresser, 499 SEK/månad med valfri manuell momssats,
- ägarstyrd hemlighetsinstallation och felsökning utan nyckelutskrift,
- versionsmärkta bilder/typsnitt och atomiskt register över publicerade versioner.

Detta är en releasegranskning av källkod, testresultat och kända driftgränser, inte en
fullständig oberoende säkerhetsgranskning av alla tidigare ändringar.

## Verifierat i den här genomgången

- Bilduppföljning: `npm test` 182/182 PASS (baslinje 177/177), kontoflöde
  45/45, autosparande 26/26 och riktade bild-/publiceringsprov i Chromium 18/18.
  Workerd/D1:s exakta bytegräns passerar tre prov. Tidigare tio publiceringar
  vardera med D1 och R2 passerar fortfarande. Alla dessa uppföljningar är lokala.
- Versionsstädningens uppföljning: `npm test` 177/177 PASS (baslinje 172/172).
  De frysta renderingsproven för nio mallar är oförändrade.
- Lokal workerd-städning med D1 och R2: aktiv plus fem, förhandsläge, samtidig
  återställning, överlappande jobb och begränsad radering i flera omgångar PASS.
- Publicerings-/API-/renderingsprov: 37/37 PASS.
- Samma lokala workerd-prov före/efter: 27/27 PASS, inklusive tio D1-publiceringar.
  Median väggtid var 124,72 ms före och 119,39 ms efter. En sådan lokal mätning är
  varken ett CPU-värde eller ett statistiskt bevis på en prestandaförbättring.
- Separat workerd-integration: tio av tio publiceringar med både D1 och R2.
  Gamla versionsresurser, samtidighetskonflikt, återställning, privata filer,
  transaktionsfel och idempotent schemaförändring verifierade.
- Konfigurerade Stripe-hemlighetsnamn och avvisad felaktig signatur verifierades
  separat före denna genomgång. Checkout öppnade rätt produkt och 499 kr/månad.

## Kvarstående risker och blockerare

1. **Riktigt abonnemang:** betalning → signerad händelse → aktiv rätt → publicering
   → uppsägning → avslut har inte verifierats. Ägarens avstående tar bort det aktuella
   manuella provet, inte osäkerheten i integrationen.
2. **CPU på gratisplanen:** tio riktiga publiceringar med molnets `cpuTime`/`outcome`
   saknas. Historiska mätningar över gränsen behöver följas upp; inga betalplansköp
   eller undantag från abonnemangskravet ingår i den här ändringen.
3. **Versionsstädning:** aktiv version plus fem andra publicerade versioner skyddas
   av den nu lokalt verifierade städningen. Förhandsläge, raderingsspärrar och
   begränsade återförsök finns för D1/R2. Aktivering i molnet och separat hantering
   av ofullständiga uppladdningar återstår; se [städguiden](version-retention-local.md).
4. **Bilder i Workers:** webbläsarens förberedelse och serverns strukturella kontroll
   är nu lokalt verifierade. Orientering, kamerametadata, transparens och högst
   1600 px ingår. Full pixelavkodning görs i webbläsaren; servern kontrollerar inte
   hela komprimeringen. [Bildguide och driftsättningsordning](worker-images-local.md).
5. **Filstorlek:** exakta gränser runt 1 900 000 byte är provade i lokal workerd/D1.
   En verklig för stor PNG avvisas av API:t med HTTP 422, feltext visas i den mobila
   dialogen och aktiv sajt bevaras. Molnprov och fysisk mobil återstår.
6. **Driftsättning av versionsadresser:** det additiva schemat måste köras först,
   sajtvärden uppdateras före API:t. Se ordning och återgång i publiceringsguiden.
7. **T08–T12:** egna domäner, verifierad formulärleverans, fysisk mobiltestning,
   återställning/larm, villkor/dataskydd och betald pilot är inte slutverifierade.

## Vad en merge gör

`.github/workflows/deploy.yml` triggas av push till `main`. Den stämplar versionen
som `1.3.<antal commits>` i byggkopian och publicerar repots filer till GitHub Pages.
Installerade PWA-klienter kan därmed få en ny appversion via service workern.

Denna workflow kör inte testsviten, migrerar inte D1 eller Supabase och uppdaterar
inte Cloudflare Workers eller den separata Cloudflare Pages-driftsättningen.
Incheckad `js/cloud-config.js` har tomma anslutningar. En merge ger därför inte
GitHub Pages samma kontokoppling som det separat konfigurerade Cloudflare-paketet.

**Ingen merge till main ingår.** Merge kräver ägarens uttryckliga ja efter att
omfattning och kvarstående risker har granskats. Den här genomgången ger inget
godkännande av pilot eller automatisk produktionsuppgradering.
