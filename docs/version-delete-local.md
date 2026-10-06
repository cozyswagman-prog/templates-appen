# Bekräftad borttagning – lokal del 10

Status 2026-10-04: lokalt implementerat och testat med syntetiska kopior i
separata testmappar. Inga befintliga användarkopior raderades i detta arbetspass.
Ingen extern tjänst, publicering, commit eller push ingår.

## Användning

I **Granskningsversioner på datorn** har varje verifierad kopia knappen **Ta bort
kopia**. Dialogen visar hela namnet, svensk tid och fullständigt versions-ID,
så kopior med samma namn går att skilja åt.

Kunden måste markera **Jag vill ta bort den här kopian permanent** och sedan
välja **Ta bort permanent**. Förvald fokus ligger på **Behåll versionen**.
Avbryt/Escape stänger dialogen utan raderingsanrop innan arbetet har startat.
Under radering är kontrollerna spärrade för att undvika dubbelklick.

Kopians HTML, bilder, typsnitt, granskningssida och manifest tas bort. Länken
slutar fungera. Redigerbara utkast i Mina projekt och andra granskningskopior
ändras inte. Efter bekräftad radering uppdateras listan och en plats frigörs.
Det är permanent borttagning, inte Windows papperskorg eller en återställningsbar arkivering.

## Lokalt API och avgränsning

`DELETE /__local/versions/<paket-id>` kräver:

- Exakt lokal Host/Origin, tillfällig headernyckel och befintliga Fetch Metadata-regler.
- `application/json`, högst 1024 byte och kroppen `{versionId, confirm:true}`.
- Ett känt paket i tjänstens register, matchande versions-ID och oförändrad
  kontrollsumma. Ingen sökväg tas emot från klienten.
- Ingen annan pågående versionsändring. Samma spärr används för skapande och
  borttagning, även medan begärans kropp tas emot.

Den absoluta målmappen kontrolleras som ett direkt barn till den kanoniska
versionsmappen. Hela paketet verifieras före första filborttagningen; länkar,
extra filer, saknade filer, ändrat innehåll och felaktiga sökvägar stoppar åtgärden.
Endast filerna från det verifierade manifestet tas bort, följt av tomma kataloger
och manifestet. Ingen rekursiv radering eller generell mapprensning används.

Åtgärden svarar lyckat och tar bort posten ur minnet först när paketmappen är borta.
En gammal flik som försöker radera en redan borttagen kopia får 404 och behöver
uppdatera listan; den kan inte träffa en annan kopia med samma projektnamn.

## Fel och kvarvarande begränsningar

Ett förlorat svar kan betyda att servern redan har utfört åtgärden. Dialogen säger
uttryckligen att borttagningen inte är bekräftad, uppdaterar listan och tillåter
ingen blind upprepning. Kunden får stänga dialogen och göra ett nytt val från listan.
Det finns inga automatiska raderingsförsök eller schemalagd rensning.

**Filraderingen är inte en atomisk transaktion.** Ett låst filhandtag, diskfel eller
avbruten process efter första filen kan lämna en ofullständig kopia. Då rapporteras
fel, platsen räknas fortfarande som använd och kopian får ingen öppningslänk.
Den kan behöva kontrolleras manuellt; appen raderar inte blint resten av ett
paket som inte längre kan verifieras. Automatisk återhämtning av delvis borttagna
paket och borttagning av sedan tidigare skadade/ofullständiga paket ingår inte.

Verktyget förutsätter en betrodd lokal användare och en instans per versionsmapp.
En annan process som aktivt byter filer/mappar under kontroll eller radering ligger
utanför denna lokala modell. Detta ersätter inte behörighetssystem, backup eller
lagringsregler för en publik fleranvändartjänst.

## Verifiering

| Kontroll | Resultat |
| --- | --- |
| Befintlig kodbaslinje före ändring | PASS – 98 tester |
| Kod/SQL/rendering/bilder/versioner efter ändring | PASS – 104 tester |
| Ny borttagningsdialog och verkliga testkopior i Chromium | PASS – 37 kontroller |
| Versionslista | PASS – 51 kontroller |
| Skapa/öppna från editorn | PASS – 46 kontroller |
| Befintlig editorgrund före/efter | PASS – 76 / 76 kontroller |
| Kontoflöden med simulerad Supabase | PASS – 45 kontroller |
| Autosparning/återställning | PASS – 25 kontroller |

Sex nya Node/HTTP-tester provar bekräftelse/identitet/behörighet, full kvot som
frigörs, kvarvarande syskonversion, ändrade filer, kataloglänkar, samtidig begäran,
avbrott före bekräftelse och ett injicerat diskfel efter första borttagna filen.
Browserprovet låter också servern slutföra en riktig syntetisk radering och
kastar bort svaret för att kontrollera klientens osäkerhetsmeddelande.

Dialogen har testats vid 390/412/768/1440 px i ljust och mörkt läge: långa namn,
fullständigt ID, tryckytor, fokus, avbryt, bekräftelse, kvarvarande utkast/annan
kopia, uppdaterad kvot och omladdning. Mobil/datorskärmbilder granskade.
Browser plugin not available; befintlig Playwright/Chromium användes. Ingen fysisk
Safari eller native Responsively verifierades.

Bevis: `C:\Users\cozys\.codex\visualizations\2026\10\04\templates-version-delete`.
Fryst rendererbaslinje, kontokonfiguration och kod för projekt-/bildlagring är
oförändrade. Källkodsändringen är avgränsad till versionstjänst, UI, tester och guider.

Nedladdning av en vald granskningsversion finns nu i
[lokal del 11](version-download-local.md). Riktiga konton, publik drift,
publicering, backup och betalning återstår inför försäljning.
