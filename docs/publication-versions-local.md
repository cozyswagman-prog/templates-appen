# Versionspaket – lokal del 7

Status 2026-10-04: lokalt verktyg för att skapa och kontrollera en separat version
av en hemsida. Ingen molntjänst, serverpublicering eller ny knapp i editorn har
aktiverats. Node-miljön och bildkraven från del 6 gäller även här.

## Användning

```powershell
npm run version:create -- C:\sokvag\kund.projekt.json C:\sokvag\NY_PAKETMAPP
npm run version:check -- C:\sokvag\NY_PAKETMAPP
```

Målmappens förälder måste finnas. Själva målmappen måste vara ny. Verktyget
returnerar `LOCAL_VERSION_CREATED` respektive `LOCAL_VERSION_VERIFIED`, versionens
ID, kontrollsumma och `published:false`. Fel ger en felkod och inget lyckat svar.

```text
Portabel projektfil → obligatorisk bildkontroll → nytt versionspaket
                                                ├─ preview.html (granskning)
                                                ├─ manifest.json (filkontroll)
                                                └─ site/ (sidor, bilder, typsnitt)
Utkastet kan sedan redigeras vidare utan att den sparade versionen ändras.
```

Förhandsgranskningen är avsedd att serveras från en separat lokal statisk server
med paketmappen som rot. Öppna `/preview.html`. Bara `site/` ska i framtiden
levereras till en publik webbplats; manifest och granskningssida är interna.
Servera aldrig en överordnad mapp som också innehåller privata projektfiler.

Granskningssidan har svenska datum, mobilanpassade länkar, ljust/mörkt läge och
tydlig status **Inte publicerad**. Den visar en isolerad ram utan skript eller
formulär och länkar till de självständiga sidorna. `allow-same-origin` behövs för
lokala typsnitt; lägg aldrig till `allow-scripts` på ramen. Separat öppnade sidor
kör mallens funktioner och kan använda externa länkar/formulärmottagare om sådana
finns i kundprojektet. Den här QA-körningen kontaktade inga sådana tjänster.

## Snapshot, filer och kontrollsumma

`tools/publication-version.cjs` exporterar `createVersion(input, destination)` och
`verifyVersion(directory, {expectedIntegrity})`. Projektet kopieras före första
asynkrona steget, så ändringar under bildavkodningen inte blandas in. Inmatningen
kan vara en projektfil v1 eller projektobjekt; privata bildreferenser måste först
hämtas till en portabel projektfil genom befintligt autentiserat projektlager.

- Varje körning får ett nytt UUID och en tidsstämpel. De faktiska sidorna och
  bearbetade bilderna kopieras in i paketet; de renderas inte om vid granskning.
- Alla nio mallar stöds, inklusive caféets tre sidor och lokala typsnittslicenser.
- Projekt-ID, kontoägare och det redigerbara originalprojektet läggs inte i paketet.
  Företagsuppgifter som syns i hemsidan finns förstås fortfarande i dess HTML.
- Manifestet listar sökväg, byteantal och SHA-256 för varje leveransfil och
  granskningssidan. Manifestets innehåll har en separat kontrollsumma.
- Kontrollen avvisar ändrade/saknade/extra filer, otillåtna sökvägar, dubbla
  poster, länkade filer/mappar, felaktig startsida och ofullständiga paket.
- Gränser: 256 filer, 20 MiB per fil, 64 MiB totalt och 128 KiB manifest. Bildstegets
  strängare begränsningar gäller dessutom innan paketet skrivs.

**Kontrollsumman är inte en digital signatur eller behörighetskontroll.** Den som
kan skriva om både filer och manifest kan skapa nya matchande kontrollsummor.
En framtida betrodd tjänst måste spara `integrity` separat och skicka den som
`expectedIntegrity`, samt kontrollera kontoägare, rättigheter och innehåll.
Verifiering körs vid skapande och på uttryckligt anrop; en redan öppen statisk
granskningssida övervakar inte filändringar.

## Fel, samtidighet och livslängd

Paketmappen reserveras med exklusiv mappskapning. Två processer kan inte skapa
samma version ovanpå varandra. En befintlig mapp – även en tom eller ofullständig –
skrivs aldrig över. Ingen automatisk radering eller ersättning finns.

Manifestet skrivs sist och paketet kontrolleras före lyckat svar. Ett diskfel eller
processavbrott kan lämna en ofullständig mapp; den ska inte levereras och nekas vid
kontroll. Skapa ett nytt paket i en ny mapp efter att felet åtgärdats. Detta är inte
en transaktion med garanterad hållbarhet vid strömavbrott eller ett OS-skrivskydd.
Den lokala användaren kan fortfarande redigera filerna manuellt.

API:t är för en betrodd lokal anropare och en betrodd överordnad mapp. Det är inte
ett säkert import-/uppladdnings-API för främmande paket eller en isolering mot
andra processer som ändrar filer under kontroll/läsning. Ingen kundtrafik tas emot.

Versionsbilderna är egna WebP-filer, utan beroende av det privata bildlagrets
objekt eller städjobb. Detta ger lokal fristående läsbarhet, inte molnbackup.
Framtida lagring behöver egna regler för kvoter, livslängd, backup, radering och
versioner som faktiskt är publicerade.

## Verifiering och kvarvarande arbete

`npm test`: 89 PASS, inklusive 8 nya versionstester; baslinje före denna del: 81 PASS.
Testerna använder verkliga bildbytes och två separata Node-processer för samtidiga
skapandeförsök. Alla nio mallars leveransfiler jämförs med befintlig renderer.
Den frysta rendererbaslinjen, tom molnkonfiguration och appens UI är oförändrade.

Granskningssidan: 61 PASS i Chromium, 390/412/768/1440 px i ljust och mörkt läge.
Sididentitet, innehåll, status, horisontell passform, tryckytor, isolerad riktig
sidvisning, öppna Meny och gå vidare till Kontakt kontrollerades. Inga oväntade
konsol- eller körfel; förväntade meddelanden om blockerade ramskript sparas separat.
Browser plugin not available; befintlig Playwright användes. Inte fysisk Safari
eller native Responsively. Mobil- och datorskärmbilder granskades visuellt.

Första browserkörningen hittade blockerade lokala typsnitt i en ram med helt tom
sandbox. `allow-same-origin` rättade detta med fortsatt spärr för skript/formulär.
Testets förväntan på H1 på menysidan rättades till mallens befintliga rubrik H2.
Det ursprungliga misslyckade resultatet finns kvar i bevismappen.

Bevis: `C:\Users\cozys\.codex\visualizations\2026\10\04\templates-publication-versions`.
Browserprovet och skärmbilder ligger utanför källkoden. Ingen ny dependency behövdes.

Kopplingen från editorn finns nu i [lokal del 8](editor-versions-local.md),
genom en begränsad lokal tjänst som återanvänder det här verktyget. Före
publik drift återstår autentisering/ägarkontroll, isolerad arbetarmiljö, lagring,
publiceringsbeslut, hosting, backup, betalning och tester med verklig testtjänst.
