# Kontospärr vid publicering – D1, lokalt verifierad

Publiceringsdelen har nu en riktig D1-adapter i
`server/account-closure-publication.mjs`. Den använder samma SQL och D1-bindning
som Worker-koden. Proven kör den både mot diskbaserad SQLite och lokal
workerd/Miniflare med D1. **Ingen molnaktivering eller verklig radering är gjord.**

## Vad som ingår

Det separata SQL-förslaget `server/proposals/account-closure-publication.sql`
ligger utanför ordinarie `server/schema.sql`. Det skapar permanenta
kontospärrar och reserverar jobbets exakta sajt-id:n i samma databasoperation.
Registren saknar beroende till sajt- och Auth-rader, så att de överlever radering.

Databastriggers stoppar därefter:

- nya sajter för kontot och återanvändning av de spärrade sajt-id:na;
- ändrad ägare, värd eller versionspekare på en spärrad sajt;
- nya eller ändrade D1-filer under sajtens exakta prefix;
- registrering av publicerade versioner, även från ett gammalt anrop.

Det skyddar även efter att sajtraden raderats. En liknande adress, exempelvis
`site-a-long`, påverkas inte av spärren för `site-a`.

`freeze(context)` binder spärren till exakt ägare, jobb, omfattningens hash,
sajtlista och körningens löpnummer. Ändrad omfattning eller ägare nekas i SQL.
Ett nytt högre löpnummer kan ta över samma jobb; ett äldre får inte skriva
tillbaka spärren. `erase(context)` kontrollerar bindningen **i varje DELETE**,
raderar endast dessa sajters filer/versioner/sajtrader och verifierar frånvaro.
Alla stegen i raderingsomgången körs i en D1-batch. Felfallet med återställning
av tidigare DELETE i samma batch är provat i lokal workerd/D1.

Cloudflares dokumentation beskriver batch som transaktioner där ett fel avbryter
eller rullar tillbaka hela följden:
[D1 batch](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).
Det ersätter inte ett verkligt driftsprov eller ett lås över flera tjänster.

## Worker och API

Worker-koden använder spärren bara när `ACCOUNT_CLOSURE_ENABLED='1'`.
Standardläget är oförändrat och kräver inte förslagets nya tabeller. Befintliga
D1-publiceringsadaptrar har flyttats till `server/d1-publication-stores.mjs`
för direkt provning; deras exportnamn från `worker.mjs` finns kvar.

När funktionen är aktiv filtreras publika HTML-sidor, versionsbundna resurser
och sajtlistor. Konto-API:t svarar 423 för stängda kontons nya sajter,
publicering och nya Checkout-förfrågningar. Stripes kundportal är fortfarande
tillgänglig för abonnemangshantering. Signerade webhooks behandlar fortsatt
faktureringsuppgifter, men kan inte ta bort kontospärren eller återpublicera.
Adaptern ändrar eller raderar inga Stripe- eller faktureringsobjekt.

Det finns ingen HTTP-route för `freeze` eller `erase`. De får endast kopplas
till en framtida betrodd, granskad jobborkestrering. `proof(context)` bevisar
bara D1-publiceringsspärren; den intygar inte privata skrivspärrar, avslutade
Stripe-anrop, stoppade uppladdningar eller hela kontots radering.

## Villkor före aktivering

**Aktivera inte förslaget eller flaggan ensamt.** Följande återstår:

1. Koppla privata Supabase-spärrar, verklig Auth/Storage-radering och
   jobbstart till publiceringsspärren, med hantering av avbrott mellan tjänster.
   Flytta D1-spärrens löpnummer framåt före varje nytt jobbanspråk som ska
   skriva/radera i D1; dess gamla nummer får inte användas efter övertagande.
2. Uppgradera alla API- och sajt-Workers samordnat. SQL-triggers skyddar
   skrivningar från äldre kod, men en äldre läsväg utan flaggan kan fortfarande
   lämna ut redan sparade filer. Saknat schema ger fel, ingen tyst fallback.
3. Säkerhetskopiera både jobbdatabasen och de två nya D1-spärrregistren.
   Äldre återställningar får inte tappa senare konton/sajt-id-spärrar.
   Supabase-backup v2 ensam innehåller inte dessa D1-tabeller.
4. Verifiera mot riktiga tjänster, inklusive sena Checkout-anrop/webhooks och
   bildlänkar som redan utfärdats. Ett Checkout-anrop som startat före spärren
   kan hinna slutföras; abonnemang måste inventeras och regleras separat före
   full kontoradering. SQL-barriären gör inte externa API-anrop atomära.
5. Hantera cache och retention uttryckligen. Redan nedladdade svar och tidigare
   cachade bilder/typsnitt kan inte återkallas av en databasändring. De gamla
   versionsbundna resurserna har lång cachetid. Nya serveranrop stoppas, men
   detta är inte bevis för att alla tidigare kopior försvunnit.

Endast D1-fillagring stöds: flaggan tillsammans med R2-bindningen `SITES`
ger 503. R2-anrop kan inte ingå i D1:s transaktion och får inte behandlas som
om de gjorde det. En full raderingsbatch kan nå tjänstens tids-/resursgräns för
stora konton; då ska den misslyckas och granskas. Lastprov, framtida begränsad
uppdelning och molnets samtidighetsbeteende återstår.

## Reproducerbara lokala prov

```text
node --test tests/account-closure-publication.test.cjs
node tests/account-closure-publication.worker.mjs EXISTING_WORKER_TOOLS_DIRECTORY
node tests/pinned-assets.worker.mjs EXISTING_WORKER_TOOLS_DIRECTORY
```

Det andra provet bygger riktig Worker-kod med redan installerad esbuild och
kör tillfällig lokal workerd/D1. Inget installeras eller driftsätts. Det tredje
kontrollerar tidigare publicering och versionsbundna resurser med funktionen
avstängd, både med lokal D1 och lokal R2. Dessa prov mäter inte Cloudflares CPU.

Enhetstesterna provar också en publicering pausad före filskrivning respektive
versionsbyte, pausad rollback, ändrad omfattning, gamla jobbkörningar,
beständiga jobb med D1-adaptern, batchfel och en syntetisk signerad Stripe-händelse.
Andra kontots data och befintliga faktureringsrader lämnas oförändrade.
