# Från lokal kontokod till separat testmiljö

Förberett 2026-10-05. Detta dokument är ett arbetsunderlag, inte ett godkännande
att skapa konto, köpa tjänster, köra databasändringar eller publicera.

## Vad vi vill bevisa

Två påhittade företag ska kunna använda varsitt konto utan att se eller ändra
varandras projekt och bilder. Arbetet ska finnas kvar på en annan enhet, och en
prövad återställning ska få tillbaka både projekt och bildfiler.

Vi har lokal kontokod och lokala tester. Supabases riktiga inloggning,
mejlleverans, datagränser och lagring är ännu inte verifierade för Templates.

## Beslut innan anslutning

- Ett separat, nytt Supabase-projekt avsett för test, utan verkliga kunddata.
- Projektägare, vald EU-region, aktuell plan/kostnadsram och hantering av testdata.
  Paketet väljer ingen region eller prisplan och beställer ingenting.
- Exakt testadress för appen och tillåtna återlänkar för inloggning/återställning.
  Befintliga adresser på datorn ska inte ändras av anslutningen; använd en separat
  arbetskopia och separat testadress.
- Två godkända testadresser för mejl, vem som genomför proven och vem som beslutar
  om resultatet räcker för nästa steg. Använd inga kunders verkliga uppgifter.
- Ett uttryckligt godkännande innan konto/projekt skapas eller tjänsten ändras.
  Inloggning och hemligheter hanteras i leverantörens gränssnitt, aldrig i chatten.

## Paketet och filkontrollen

Kör från Templates kanoniska källkod:

```powershell
npm run accounts:prepare-kit -- C:\vald-plats\NY-testpaketmapp
npm run accounts:check-kit -- C:\vald-plats\NY-testpaketmapp
```

Föräldramappen måste finnas. Verktyget skapar bara en ny mapp utanför källkoden;
en befintlig mapp skrivs aldrig över. Länkar, saknade/extra filer och ändrade bytes
underkänns. Ett diskfel kan lämna en ofullständig mapp; den ska inspekteras och
inte användas som ett färdigt paket. Verktyget raderar ingenting automatiskt.

Paketet innehåller de tre SQL-filerna i rätt ordning, fyra guider, en frånkopplad
konfigurationsmall och en mall för testresultat. `manifest.json` binder filerna
och versionen av central konto-/lagringskod med SHA-256. Filkontrollen jämför
även med aktuell källkod; ändras koden eller guiderna behöver paketet skapas om.
Detta är en lokal jämförelse, inte en digital signatur eller ett revisionsbevis.

Kör kontrollen från den betrodda källkoden omedelbart före användning. `LOCAL_FILES_VERIFIED`
betyder bara att filerna matchar. Det är inte bevis för tjänstefunktion eller
lanseringsgodkännande. Inga tester körs automatiskt av paketverktyget.

## Genomförande efter godkännande

1. Bekräfta projektets identitet, att det är tomt på Templates-tabeller/bucket,
   region och kostnadsbeslut. Om det redan finns Templates-data: stoppa och
   granska läget; kör inte detta nyinstallationspaket ovanpå den miljön.
2. Kontrollera filpaketet och granska SQL-filerna. Använd normal, dokumenterad
   migrationshantering med följande ordning:
   - `202610030001_projects.sql`
   - `202610040001_private_images.sql`
   - `202610040002_image_lifecycle.sql`
3. Kör en migration i taget. Dokumentera filhash och resultat utanför paketet.
   Vid första felet: stoppa. Varje fil har egen transaktion, men alla tre filer
   tillsammans är inte en enda transaktion. Tidigare lyckade steg kan finnas kvar.
   Gör ingen blind omkörning, återställning eller automatisk borttagning av miljön.
4. Verifiera faktiska rättigheter, RLS, RPC-rättigheter, privat `project-images`-
   bucket och att inga andra Storage-policyer ger bredare åtkomst. `public`
   behöver finnas i Data API:s exponerade scheman. Lokala testfixturer räcker inte.
5. Ställ in mejlbekräftelse, lösenordskrav, godkänd avsändare, missbruksskydd och
   exakta återlänkar. Appen använder aktuell origin + sökväg, utan hash, som
   återlänk. Kontrollera det faktiska mejlet. Den här appens PKCE-flöde behöver
   provas i samma webbläsare som startade registrering/återställning.
6. Lägg enbart projektets URL och publika `sb_publishable_...`-nyckel i den
   isolerade testkopians `js/cloud-config.js`. Ingen hemlig/service-role-nyckel
   eller databasanslutning hör hemma i webbläsaren. Paketets exempel är tomt
   och läser/kopierar aldrig din befintliga konfiguration.
7. Kopiera `acceptance-template.json` till en separat resultatfil utanför paketet.
   Prova alla 13 fall med A/B-testkonton och dokumentera utfall. Radera/återställ
   bara uttryckligen godkända syntetiska testobjekt. Bildrensning börjar med
   torrkörning och schemaläggs inte av det här paketet.
8. Samla PASS/FAIL/BLOCKED, datum och avidentifierade bevis. Ofullständiga eller
   osäkra utfall är inte PASS. NOT_RUN betyder att provet inte har utförts.

Inga lösenord, sessionsvärden, nycklar eller riktiga kunduppgifter ska skrivas i
resultatfilen. Maskera identifierare i loggar och skärmbilder. Dokumentera vilken
miljö och källversion som provades med interna alias och filhashar.

## Backup måste omfatta bilderna också

En databasbackup innehåller inte själva filerna i Supabase Storage. Projektens
bildreferenser kan därför återställas medan bildinnehållet fortfarande saknas.
Planera och prova återställning av både databas och Storage-filer i en separat
godkänd testmiljö. Jämför bildhashar och prova återställd export samt A/B-isolering.
[Supabases dokumentation om databasbackup](https://supabase.com/docs/guides/platform/backups).

## Lokala bevis och kvarvarande gräns

```powershell
npm test
npm run test:accounts
npm run test:autosave
```

De två sista använder befintlig Playwright/Chromium och lokal filserver enligt
kontoguiden. Kontoprovet avlyssnar och simulerar tjänstens svar; det ansluter inte
verkliga konton. PGlite-proven kontrollerar SQL-regler med Auth/Storage-fixturer,
inte den kompletta Supabase-tjänsten.

Efter godkända tjänsteprov återstår fortfarande frågor inför försäljning, bland
annat komplett publiceringsflöde, kontoavslut/datalivscykel, missbruks- och
projektgränser, betalning, support och användartester. Paketet lovar ingen tidpunkt
eller kostnad för lansering.

## Primärkällor kontrollerade 2026-10-05

- [RLS och åtkomstregler](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Återlänkar och Site URL](https://supabase.com/docs/guides/auth/redirect-urls)
- [Databasbackup och Storage-begränsningen](https://supabase.com/docs/guides/platform/backups)
- [Backup/restore och separata steg för Auth/Storage-anpassningar](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)
