# Automatisk sparning och återhämtning – lokal del 3

Datum: 2026-10-03. Allt är lokalt; Supabase är fortfarande frånkopplat i standardkonfigurationen.

## Beteende för kunden

- Text, projektnamn, bildbyten och företagsinställningar sparas efter 1,5 sekunders
  paus i redigeringen. Att bara titta på en mall skapar inget sparat projekt.
- **Sparar…** följs av **Sparat på den här enheten** eller **Sparat på ditt konto**
  först efter lyckad lagring. Ändringar under begäran leder till ytterligare en sparning.
- Vid nätfel, full lagring eller versionskrock stannar automatiken. Texten finns kvar,
  felet visas och **Spara** ger ett kontrollerat nytt försök. Inget tyst överskrivande
  eller obegränsad försöksloop sker.
- Lämna-dialogen stoppar väntande autosparning. **Lämna utan att spara** kastar endast
  de ännu osparade ändringarna; tidigare autosparade ändringar är redan beständiga.
- Vid omladdning kan osparat arbete återställas som **ett nytt projekt**. Den tidigare
  sparade versionen behålls. Kopian kan också laddas ner eller tas bort efter bekräftelse.
- Flera väntande projekt bevaras och hanteras ett i taget. Ett redan sparat projekt med
  en väntande kopia öppnas inte över kopian; kunden får först välja hur den ska hanteras.

## Gränser som visas/behålls i produkten

Återställningskopiorna lagras per flik i sessionStorage, separerade mellan lokal plats
och konto-id. De är inte en extra molnsparning och visas aldrig som **Sparat på kontot**.
De överlever omladdning av samma flik, men är inte avsedda som backup efter att fliken
stängts eller webbläsarens data raderats. Det följer sessionStorages
[dokumenterade livslängd](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).

Vid utloggning/kontobyte rensas privata återställningskopior; en avbruten pågående
redigering kan fortfarande räddas via den befintliga dialogens **Spara ändringarna
som fil**. Enhetsprojekt är gemensamma för den aktuella webbläsaren, som tidigare.
Sparandet av återställningskopian sker vid ändringar och även vid sidans lämning/
bakgrundsläge. Om lagringen är full eller avstängd visas att kopian inte kunde
uppdateras och att kunden bör spara en projektfil. Stora bilder kan nå denna gräns
även när projektet ryms inom molnlagringens separata 20 MB-gräns.

Lokala revisioner och [Web Locks](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API)
skyddar alla skrivningar/raderingar av hela localStorage-listan, även mellan olika
projekt. Äldre projekt utan revisionsnummer stöds; import och återställning får nya
identiteter utan gamla revisionsfält. I en webbläsare utan Web Locks är automatisk
lokal sparning avstängd och manuell sparning har bara revisionsjämförelse, utan en
garanti för samtidiga flikar. HTTPS eller localhost och en modern webbläsare krävs
för det fulla lokala skyddet. Node-tester använder ingen webbläsarlåsning; den provas
med riktiga samtidiga Chromium-flikar.

## Verifiering

```powershell
npm test
npm run test:autosave
npm run test:accounts
npm run test:browser
```

Använd befintlig Playwright/Chromium och lokal filserver på 127.0.0.1:8767, eller
ange `TEMPLATES_TEST_URL`. Inga nya testberoenden tillkom i detta steg.
Browser plugin not available; befintlig Playwright används.

Avbrottstesterna provar autosparad flersidig text, omladdning före sparning, återställd
kopia utan överskrivning, flera väntande kopior, två flikar, parallella separata
projekt, full lagring, explicit kassering, manuell återhämtning och nya autosparningar.
Kontoprovet använder officiell SDK med simulerade API-svar och provar även automatisk
sparning efter en pågående begäran, paus efter nätfel, återställning på rätt konto och
rensning vid utloggning. SQL-isoleringen har egna lokala Postgres-tester.

Detta är inte livebevis för Supabase, verklig mejlleverans eller fysisk iPhone/Safari.
Separat privat bildlagring med formatkontroll och kvoter finns nu lokalt förberedd,
se [bildguiden](private-images-local.md). Serverbackup och en verklig testtjänst
återstår före pilot.
