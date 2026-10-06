# Kontostängning och raderingsprov – endast lokalt

`supabase/proposals/account-closure.sql` är en provad SQL-prototyp, placerad
**utanför migrationsmappen**. Den körs bara i lokala prov och vid lokal verifiering
av backup v2, aldrig i molnet av backupverktygen eller appen. Den skapar en bestående stängningsmarkering per konto. Markeringen
hindrar fortsatt läsning av privata projekt/bilder samt nya sparningar,
bildreservationer och uppladdningar. Kundens sessions-id kan fortfarande vara
giltigt, men databasens regler nekar åtkomst.

`begin_account_closure` får bara köras av serverrollen efter godkänd handläggning.
Den raderar inget och får inte anropas för riktiga konton som del av ett prov.
Markerade konton kan inte öppnas igen via någon funktion i detta förslag.
En markering överlever radering av själva Auth-kontot och hindrar att återlästa
projekt från en gammal backup blir tillgängliga igen.

## Prov som går att köra utan molnåtkomst

```powershell
node --test tests/account-closure.test.cjs
```

Provet använder två syntetiska konton i en tom Postgres (PGlite) och SQLite i
minnet. Det kör projektets verkliga migreringar, SQL-förslaget och D1-schemat.
Det läser inga kundbackuper, nycklar eller sessionsuppgifter och ansluter inte
till Supabase, Cloudflare eller Stripe.

Det provar att:

- kunder och anonyma inte kan stänga konton eller läsa/ta bort spärrar;
- aktiv eller okänd abonnemangsstatus stoppar det lokala raderingsprovet;
- spärren kan sättas upprepade gånger med samma resultat;
- en tidigare inloggad användare nekas läsning, sparning, egen projektradering,
  både nya och befintliga bildreservationer samt en väntande uppladdning;
- ett simulerat fel mitt i bildraderingen behåller Auth-kontot och spärren;
- återförsök tar bort målprojekt, referenser, reservationer, bildbytes, lokal
  sajt, alla dess versioner/filer och de granskade lokala abonnemangskopplingarna;
- det andra kontot, ett sajt-id med liknande prefix, okända ägarfiler och globala
  faktureringshändelser förblir oförändrade;
- återläsning av ett gammalt konto-id inte gör gamla projekt tillgängliga igen.

Raderingsordningen i testet är en **lokal repetition**, inte en körbar
produktionsfunktion. Storage-bytaraderingen och Auth-tjänsten är testfixturer.
SQL-radering av `storage.objects` sker enbart inuti den simulerade
Storage-tjänsten; en verklig implementation måste använda Storage API.

## Kvar före en verklig funktion

1. Backup v2 och lokal återställning med stängningsmarkeringar är implementerade
   och provade; se `backup-local.md`. V1 stöds med uttryckligen okänt
   stängningsskydd. Driftjobben, separat aktuellt register, gallring och verklig
   restore är ännu inte överförda. SQL-förslaget får **inte driftsättas ensamt**.
   Åtkomst får inte öppnas från äldre backup utan att senare stängningar förenats.
2. Samordna spärren med D1/publicering, versionsåterställning, Stripe-webhooks,
   sessioner, redan pågående anrop och uppladdningar. Supabase-låset är lokalt
   för en databastransaktion och låser inte andra tjänster. En redan hämtad
   publiceringskopia eller utfärdad bildlänk kan finnas kvar.
   D1-publiceringsbarriär och en avstängd Worker-koppling är nu lokalt provade;
   se `account-closure-publication-local.md`. Samordnad driftaktivering,
   övriga tjänster och redan cachade svar återstår.
3. Lokal beständig jobbkoordinator med exakt omfattning, kontrollpunkter,
   arbetslås, verifiering och begränsade återförsök finns nu; se
   `account-closure-jobs-local.md`. Verkliga tjänsteadaptrar, samordnade spärrar,
   schemaläggning och skyddad backup av jobb återstår.
   Domäner, Formspree, supportdata, finansiella bevarandebeslut och backupkopior
   måste hanteras särskilt. Globala faktureringshändelser saknar direkt konto-id
   i nuvarande schema och får inte raderas genom gissning.
4. Testa Supabase Auth/Storage API och Cloudflare med två syntetiska konton i en
   separat godkänd tjänst. Prova verkligt parallella anslutningar: PGlites
   enkelanslutning bevisar inte låsbeteende under verklig samtidighet.
   Supabase-adapter med riktiga SDK-anrop mot lokala testtjänster och SQL samt
   kombinerat avbrottsprov med D1 finns nu; se `account-closure-supabase-local.md`.
   Detta ersätter inte det separata verkliga tjänsteprovet.
5. Verifiera klientens felbesked för `PT423` före eventuell aktivering.

Supabase dokumenterar att redan utfärdade JWT-token kan leva till sin utgång
och att Storage-objekt behöver hanteras före Auth-radering:
[Managing user data](https://supabase.com/docs/guides/auth/managing-user-data).
Bildbytes ska raderas genom tjänstens API:
[Delete objects](https://supabase.com/docs/guides/storage/management/delete-objects).

Det lokala provet innebär inte att full kontoradering, backupåterställning,
GDPR-hantering eller pilotacceptans är färdig.
