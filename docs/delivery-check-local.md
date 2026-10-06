# Kontroll före leverans – lokal del 12

Implementerad 2026-10-05. Lokal rådgivande kontroll, ingen publicering eller extern
anslutning. Kontrollen är inte ett godkännande av hemsidan.

## Kundflöde

1. Öppna ett enhetsprojekt på `http://127.0.0.1:8769/`.
2. Välj **Mer → Skapa version för granskning** och skapa en ny kopia.
3. Välj **Öppna granskningsversion**. Ovanför förhandsvisningen finns
   **Kontrollera din hemsida**, uppdelad per sida.
4. Öppna en kontrollpunkt för att se råd och berörda rutor eller fältnamn.
5. Rätta i utkastet och skapa en ny version. Den tidigare kopian ändras inte.

Kontrollen innehåller utfällbara råd, sidlänkar och en manuell checklista. Inga
avbockningar sparas och ingen grön "godkänd för publicering"-status skapas.
ZIP-nedladdningen är fortsatt tillgänglig; råden är inte ett nytt exportförbud.

## Vad som kontrolleras

- Oförändrade texter jämförs med mallen. Det är ett granskningsråd: en oförändrad
  rubrik som "Vanliga frågor" kan vara helt korrekt. Namn, priser och öppettider
  behöver läsas av kunden; automatiken vet inte vilka uppgifter som stämmer.
- Tomma numrerade/named textfält anges separat. Numrerade rutor behåller sina
  faktiska nummer; extra fält använder etiketten som syns i editorn.
- Synliga kontaktavsnitt kontrolleras för ifyllt gemensamt företagsnamn och en
  telefon- eller mejllänk i det gemensamma kontaktavsnittet. Äldre kontakttexter
  på andra ställen ersätter inte denna kontroll och måste läsas manuellt.
- Kvarvarande inbyggda SVG-exempelbilder listas. Riktiga bilders kvalitet,
  användningsrätt och innehåll bedöms inte. Byte av bild hanteras fortfarande
  av den separata befintliga bildbearbetningen.
- Inaktiva länkar, formulär utan godkänd mottagaradress och interna länkar till
  saknade sidor/avsnitt blir råd. Externa länkar och konfigurerade formulär
  räknas, men inga adresser besöks och inga formulär skickas.
- Avsnitt som användaren dolt (`data-section[hidden]`) utesluts. Innehåll i
  utfällbara rutor eller bakom Före/Efter-knappar är nåbart och granskas.

Den manuella checklistan tar upp företagsuppgifter, priser, öppettider,
bild-/omdömesrätt, mobil/dator, menyer/filter samt verklig mottagning av
förfrågningar och bokningar. Den lokala granskningsservern blockerar
formulärsändning; nedladdade/publicerade sidor kan kontakta konfigurerade tjänster.

## Teknisk avgränsning

`tools/delivery-check.cjs` använder en privat kopia av projektet och de redan
bearbetade sidfilerna. Samma SiteKit-regler och ordning för textöverskrivning som
renderern används för att behålla rutor/etiketter i råden. Företagsuppgifter,
bildplatshållare, länkar och formulär läses ur de faktiska förberedda HTML-filerna.
Inga kundskript körs, inga nätverksanrop görs och projektobjektet ändras inte.

Rapporten skrivs bara till `preview.html` när en ny version skapas. Den ingår i
paketets befintliga SHA-256-kontroll men inte i `site/` eller den nedladdade ZIP:en.
Manifestformatet är oförändrat. Äldre versioner är fortfarande verifierbara,
öppningsbara och nedladdningsbara utan någon migrering eller omskrivning.

Inga nya beroenden, API-endpoints, konton eller bakgrundsjobb har lagts till.
Kontrollen är begränsad till kända mallar och fält, inte en allmän tillgänglighets-,
säkerhets-, SEO- eller juridisk granskning av valfria webbsidor.

## Lokal verifiering

| Kontroll | Resultat |
| --- | --- |
| Kodbaslinje före / efter | PASS – 108 / 114 tester |
| Alla nio mallar, sidindelning, textändringar, tomma fält, dolda avsnitt, säker text och oförändrade ZIP-bytes | PASS – ingår i kodtesterna |
| Ny kontroll i faktiskt editor-/granskningsflöde | PASS – 41 kontroller |
| Skapa / lista / ladda ner / ta bort versioner | PASS – 46 / 51 / 53 / 37 kontroller |
| Befintlig editorgrund före / efter | PASS – 76 / 76 kontroller |

Browser plugin not available; befintlig Playwright/Chromium användes. 390, 412,
768 och 1440 px provade i ljust och mörkt läge. Tangentbordsöppning, minst 44 px
höga kontroller, korrekt sidlänk, sen utkaständring och äldre faktiskt paket
verifierade. Mobil/surfplatta/dator visuellt granskade. Inga oväntade JavaScriptfel.
Native Responsively och fysisk Safari har inte verifierats.

Bevis utanför repo:
`C:\Users\cozys\.codex\visualizations\2026\10\05\templates-delivery-check`.
Alla skapade/raderade versioner i testerna är syntetiska. Ordinarie användarmapp
används inte som testdata. Det första nya testet antog felaktigt att varje Café-sida
hade bilder; testet rättades efter inspektion. Den befintliga baslinjen var godkänd
före ändringen och ingen förväntan i befintliga tester ändrades.

Nästa steg mot en kundpilot är att avgränsa och verifiera konto, privat lagring
och återställning i en riktig separat testmiljö. Anslutningen kräver ett särskilt
beslut; den här leveransen ansluter inte Supabase eller andra externa tjänster.
