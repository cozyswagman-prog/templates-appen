# Granskningsversion från editorn – lokal del 8

Status 2026-10-04: lokalt implementerat och testat. Ingen extern tjänst ansluten,
ingen publicering och inga ändringar i den offentliga GitHub Pages-versionen.

## Starta och använd

Kör `npm run start:local` i källkodens mapp. Kräver befintliga Node-beroenden.

- Öppna `http://127.0.0.1:8769/`, välj en mall eller importera en projektfil.
- Redigera och välj **Mer → Skapa version för granskning**.
- Läs förklaringen och välj **Skapa granskningsversion**. En kopia av de senaste
  redigerade fälten skickas till den lokala tjänsten, även om autosparningen inte
  hunnit bli klar. Detta ersätter inte sparning av det redigerbara utkastet.
- När skapandet bekräftas visas **Öppna granskningsversion**. Länken öppnar en ny
  flik på en separat lokal adress. Fortsatt redigering påverkar inte kopian.
- Stoppa tjänsten med Ctrl+C när den inte behövs.

**Den nya porten är en separat webbläsaradress med egen localStorage.** Projekt
från exempelvis port 8767 eller GitHub Pages har inte försvunnit; öppna den gamla
adressen, spara en projektfil och importera den på den nya. Ingenting flyttas eller
kopieras automatiskt. Galleriet förklarar detta.

Versionspaket sparas normalt i `C:\Users\cozys\Templates-local-versions` på denna
dator (`os.homedir()/Templates-local-versions` generellt), utanför det publika repot.
Appen kör på 8769 och granskning på 8770, båda bundna till `127.0.0.1`.
Vid portkrock avbryts start; någon annan process stoppas inte automatiskt.

Knappen visas endast i tjänstens lokala körläge och för enhetsprojekt. Vanlig
statisk app, GitHub Pages, artifact och kontoprojekt får inte knappen. Ingen
automatisk sökning efter lokala tjänster sker från den vanliga appen.

## Flöde och skydd

```text
Editor på 8769 → lokal begäran → bildkontroll → versionspaket på disk
                                                     ↓
                          granskning på separat port 8770
```

`tools/local-version-server.cjs` använder standardbiblioteket i Node och del 7:s
`createVersion`/`verifyVersion`. Inga nya beroenden har lagts till.

- Bara loopback lyssnar; ingen LAN-adress eller publik nätverksbindning.
- Appen serveras från en fast lista filtyper/sökvägar; verktyg, dokument, tester,
  projektfiler, paketmetadata och godtyckliga diskmappningar exponeras inte.
- Host kontrolleras. API-anrop med främmande Origin eller Fetch Metadata avvisas.
  Skapande kräver exakt egen Origin, JSON och en slumpad nyckel i en separat header.
  Nyckeln skapas per start, hämtas från egen origin och skrivs inte i URL eller logg.
  Inga CORS-tillstånd ges. Appen får inte bäddas in i en främmande ram.
- Förhandsvisning serveras från en separat origin, utan API eller editorlagring.
  Endast färdiga registrerade versionsfiler får läsas. Manifestets separat hållna
  kontrollsumma och alla filhashar kontrolleras vid varje läsning.
- Granskningsserverns innehållspolicy spärrar nätanrop från skript och
  formulärsändning. Mallarnas lokala filter och sidlänkar fungerar; riktiga
  formulär-/bokningstjänster behöver ett separat godkänt integrationstest.
- Versionssvar och leveransfiler har `no-store`. Service worker registreras inte i
  det lokala körläget; detta är ingen offline-/PWA-verifiering.

Detta är ett verktyg för **en betrodd lokal användare**, inte inloggning, skydd mot
annan lokal programvara eller ett publikt API. Den överordnade lagringsmappen och
källkoden förutsätts betrodda. Starta en instans per lagringsmapp. Filsystemkapplöpningar
med andra skrivande processer och manipulation av både filer/manifest över en
omstart ligger utanför denna lokala kontroll; drift kräver ett betrott versionsregister.

## Fel och begränsningar

- En begäran behandlas åt gången, inklusive mottagning. Samtidiga försök får ett
  tydligt upptagen-svar. Inga automatiska återförsök eller obegränsad kö finns.
- Högst 20 MiB begäran, 20 versionsmappar per lagringsmapp och tidigare bild-/paketgränser
  gäller. Även ofullständiga versionsmappar tar plats i kvoten. Verktyget raderar inget.
- HTTP-begäran har tidsgränser och klienten slutar vänta efter 45 sekunder. Vid
  nätavbrott kan ett paket ha skapats trots saknat svar; dialogen säger det uttryckligen.
- Knappen spärras under bildbehandling och versionsskapande. Under själva skapandet
  kan dialogen inte stängas normalt. Omladdning kan avbryta klienten; servern kan
  fortsätta slutföra kopian. Lagrings-/kontobyte återställer dialogen och döljer sena svar.
- Ett fel lämnar utkastet orört och tillåter uttryckligt återförsök. Autosparningens
  status ändras inte till sparat av ett lyckat versionsskapande.
- Länken visas efter lyckad körning. En lista för återöppning finns nu i
  [lokal del 9](version-list-local.md). Kompletta paket finns på disk och kan läsas
  igen efter omstart på samma portar. Manuellt ändrade paket avvisas under körningen.
- Filkontrollerna är inte backup, signering, antivirus, processisolering eller
  färdig publik säkerhetsgranskning. Bildarbetarens tidigare dokumenterade gränser gäller.

## Verifiering

- Befintlig kodbaslinje: **89 PASS** före ändring. Efter ändring: **95 PASS**, med
  sex nya verkliga HTTP-tester för filskrivning, ursprung/Host/nyckel, storleksgräns,
  felåterhämtning, samtidig begäran, kvot, filändring och omstart.
- Nytt editorflöde: **46 PASS** i Chromium. Fyra bredder 390/412/768/1440 px,
  ljust/mörkt läge, tryckytor, faktisk version, sidnavigation, oförändrad äldre
  kopia, avbruten anslutning, lyckat återförsök och dold funktion i statiskt läge.
- Befintlig browsergrund: **76 PASS** före och efter ändringen.
- Befintliga kontoflöden med simulerad Supabase: **45 PASS**. Autosparning: **25 PASS**.
- Fryst rendererbaslinje och tom molnkonfiguration är oförändrade. `artifact.html`
  är synkroniserad med appens nya markup men behåller sin fragmentstruktur.

Testservern på 8767 var först avstängd och startades om före browserbaslinjen.
Två senare teststarter nådde timeout under sidladdning; oförändrade omkörningar
passerade. Orsaken till dessa tillfälliga laddningsstopp är inte fastställd.
Ingen testförväntan eller fryst baseline ändrades för att dölja detta.

Bevis: `C:\Users\cozys\.codex\visualizations\2026\10\04\templates-editor-versions`.
Tillfällig browserkod och syntetiska paket ligger där, utanför repot. Mobilens
framgångsläge och dialogens mörka datorläge är visuellt granskade. Browser plugin
not available; befintlig Playwright användes. Inte fysisk Safari/native Responsively.

Versionslistan för att hitta och öppna tidigare granskningar är nu implementerad
i [lokal del 9](version-list-local.md). Inför försäljning återstår riktiga konton, publik driftmiljö,
backup, publiceringsflöde och betalning; denna del ansluter inget av dessa.

