# Kontoexport och raderingsunderlag – lokal förberedelse

`tools/account-data.cjs` skapar ett separat paket för ett exakt konto-id från en
befintlig `templates-backup-v1`. Det kontaktar inga tjänster, läser inga nycklar
och har ingen funktion som raderar data. Kontot väljs av en behörig operatör efter
identitetskontroll; detta är inte en publik API-rutt eller en inloggningskontroll.

```powershell
node tools/account-data.cjs prepare D:\Templates-backup\2026-10-06 KONTO-UUID D:\Templates-backup\kontoexport-NY
```

Målet måste vara nytt, separat från backupen och utanför Git. Länkar/junctions,
felaktiga hashar, saknade/extra filer, okända ägare och dubbla identiteter nekas.
Filer läses en gång till minnet och utdata återläses före färdigställandet.
Avbruten skrivning lämnar bara en `.partial`-mapp; inget befintligt skrivs över.
Kontrollsummor upptäcker skada, men är inte en signatur som bevisar vem som skapade
backupen. Använd endast en betrodd säkerhetskopia.

Paketet innehåller:

- `account-data.json`: kontots id, e-post och datum samt egna projekt,
  bildreservationer och bildreferenser. Driftfält som raderingstoken utesluts.
- `projects/*.projekt.json`: portabla projektfiler där privata bildreferenser
  ersatts med samma kontos faktiska bildbytes.
- `images/`: kontots bildfiler, även uppladdade filer som inget projekt använder.
- `deletion-preview.json`: exakta projektrevisioner, bildnamn och granskningssteg.
  Filen är ett underlag, inte ett körbart raderingskommando eller godkännande.
- `manifest.json`: backupens datum/fingeravtryck samt utfilernas storlek/hash.

## Gränser och nästa kontroll

Det är en ögonblicksbild av backupens Supabase-del, **inte ett komplett
registerutdrag eller färdig full kontoradering**. D1:s sajter, versioner och
abonnemangsreferenser, publicerade filer, Stripe, Formspree, support, sessioner,
övriga Auth-fält och senare ändringar behöver inventeras separat. Lösenord ska
aldrig exporteras till kunden. Paketet innehåller personuppgifter; håll det
skyddat utanför Git. Det distribueras inte av verktyget.

Inför verklig radering: avgränsa konto och system, granska bevarande och
abonnemang, stoppa samtidiga skrivningar, ta aktuell inventering och få konkret
godkännande. Privata bildfiler måste hanteras via Storage API, inte SQL-radering
av Storage-metadata. Publicerade sajter/filer och Auth är separata åtgärder.
Återförsök måste vara idempotenta och återläsning av äldre backup får inte
återinföra raderade konton. En sådan körbar samordning är ännu inte implementerad.

Lokala tester i `tests/account-data.test.cjs` omfattar två konton med samma
projekt-id, bildisolering, portabla projekt, saknade/skadade filer, orphan-bilder,
okända ägare, länkar, överskrivningsskydd och maskade kommandofel. De bevisar
verktygets lokala beteende, inte en riktig Supabase-återställning eller radering.
