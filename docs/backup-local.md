# Backup av kontodata och bilder

Förberett 2026-10-06. Verktygen körs lokalt på din dator. De publicerar ingenting och ändrar
ingenting i Supabase.

## Varför två delar

En backup av Templates måste innehålla både **databasens rader** och **bildfilerna**.
Supabase lagrar bilderna separat, och en databasbackup innehåller bara uppgifter om dem.
Utan bildfilerna går kundernas projekt inte att öppna eller exportera efter en
återställning. Supabases gratisplan har inga nedladdningsbara backuper.

```text
Supabase ──(hemlig nyckel, bara läsning)──▶ ny backupmapp utanför källkoden
                                             ├─ db/projects.json, project_images.json,
                                             │  project_image_refs.json, users.json
                                             ├─ storage/project-images/<konto>/<bild>
                                             └─ manifest.json (SHA-256 för allt)
                                                       │
                       npm run backup:verify ◀─────────┘
                       tom lokal Postgres + migreringar + bilder → öppna, exportera, isolering
```

## Skapa en backup

Kör i en egen terminal, i källkodsmappen. Den hemliga nyckeln hämtar du i Supabase
Dashboard → Project Settings → API Keys. Skriv aldrig nyckeln i en fil, i chatten eller i Git.

```powershell
$env:TEMPLATES_BACKUP_URL = 'https://<projekt>.supabase.co'
$env:TEMPLATES_BACKUP_SECRET_KEY = Read-Host 'Hemlig nyckel' -MaskInput
npm run backup:create -- D:\Templates-backup\2026-10-06
Remove-Item Env:TEMPLATES_BACKUP_SECRET_KEY
```

- Målmappen måste vara ny och ligga utanför källkoden. Inget skrivs över.
- Under körningen skrivs allt till `<mapp>.partial`. Mappen får sitt riktiga namn först när
  allt är hämtat och kontrollerat. En kvarlämnad `.partial` är alltså inte en färdig backup.
- Backupen stoppas om en bild inte stämmer med sin innehållsnyckel (SHA-256), eller om ett
  projekt pekar på en bild som saknas i lagringen.
- En reserverad bild som aldrig laddades upp ger bara en anmärkning, eftersom den inte
  påverkar något sparat projekt.
- Nyckeln visas aldrig och sparas aldrig i backupen. Den publika nyckeln (`sb_publishable_`)
  avvisas.

## Rutin (gäller tills annat beslutas)

- **När:** en gång i veckan, och dessutom före varje migrering, större kodändring
  eller publicering.
- **Varje gång:** skapa en ny backup och kör `backup:verify` direkt efteråt. En backup
  som inte är kontrollerad räknas inte.
- **Förvaring:** en krypterad extern disk (till exempel BitLocker To Go). Behåll de
  fyra senaste veckorna. Lägg aldrig backupen i Git eller i en delad molnmapp.
- **Före betald pilot:** återställ en gång i ett separat Supabase-projekt och
  dokumentera resultatet.

## Kontrollera en backup

```powershell
npm run backup:verify -- D:\Templates-backup\2026-10-06 D:\Templates-backup\2026-10-06-kontroll.json
```

Kontrollen:
- Jämför varje fil med manifestet och varje bild med sin innehållsnyckel.
- Bygger en tom lokal Postgres (PGlite) med projektets migreringar och lägger in backupen.
- Låter databasens egen trigger återskapa bildreferenserna.
- Öppnar och exporterar varje projekt som dess ägare.
- Kontrollerar att ägarna hålls isär och att anonym läsning nekas.

Om något fel upptäcks avslutas kommandot med felkod.

## Gränser

### Kontostängningar: nytt opt-in-format v2

Den nuvarande driftmiljön använder v1 och har inte fått kontostängningsprototypen.
Det vanliga kommandot behåller därför v1. Rapporten anger uttryckligen
`UNKNOWN_LEGACY_WITHOUT_CLOSURES`: fil-/databaskontrollen kan passera utan att
skydd mot återaktivering av stängda konton är bevisat.

För en framtida godkänd miljö med stängningsregistret används:

```powershell
npm run backup:create -- D:\Templates-backup\NY-V2 --with-closures
npm run backup:verify -- D:\Templates-backup\NY-V2 --require-closures
```

V2 tar med `db/account_closures.json`, även markeringar vars Auth-konto redan
är borttaget. Serverrollen har endast läsrätt till registret. Saknad tabell,
nekad läsning eller ogiltiga markeringar stoppar körningen; den faller aldrig
tillbaka till v1. Registret läses före och efter data/bilder. Om det har ändrats
lämnas bara en ofullständig `.partial`-mapp. Detta är inte en transaktion över
alla tjänster och ersätter inte stoppade skrivningar vid en verklig återställning.

Den lokala verifieraren läser in stängningsschemat och markeringarna **före**
konton, projekt och bilder. Den hoppar över dessa data för markerade konton och
provar att även en senare återinförd gammal kontoid nekas sparning. Originalbackupen
ändras eller gallras inte. Den kan fortfarande innehålla historiska kunddata.
Schemahashen är bunden till `supabase/proposals/account-closure.sql`; ändrat
schema kräver granskning, inte automatisk acceptans.

Äldre v1/v2 kan kombineras med markeringar från en nyare, betrodd v2-backup:

```powershell
npm run backup:verify -- D:\Templates-backup\GAMMAL --closures-from D:\Templates-backup\NY-V2 --require-closures
```

Källprojektet måste vara samma och markeringsbackupens datum minst lika nytt.
Registren förenas: en markering tas aldrig bort för att den saknas i den nyare
filen. Saknade, extra eller ändrade filer underkänns. Hashar är integritetskontroll,
inte digitala signaturer; operatören måste välja betrodda kopior.

`CAPTURED_AS_OF_BACKUP` betyder bara känt vid backupens tidpunkt. Nya stängningar
efter den tidpunkten måste hämtas från ett aktuellt skyddat register. En gammal
backup ensam blir inte säker bara för att dess v2-kontroll passerar. Rapporten
anger alltid `liveRestoreApproved: false`; inga molndata skrivs av kontrollen.

Före aktivering i drift måste alla backupjobb övergå till v2, markeringarna
skyddas även separat och hela återställningsrutinen kräva aktuellt register.
SQL-prototypen får fortfarande inte driftsättas ensam. Samordnade raderingsjobb,
publiceringsspärr och verklig tjänste-QA återstår.

- **Innehåller kunddata och e-postadresser.** Förvara backupen krypterad och utanför Git
  och delade mappar.
- **Lösenord och sessioner ingår inte.** Efter en verklig katastrof återskapas konton med
  samma id (Supabases admin-API), och kunderna väljer nytt lösenord.
- **Databasschemat ingår inte.** Det återskapas från `supabase/migrations`. Manifestet
  sparar migreringarnas kontrollsummor (radslut normaliserade), och kontrollen varnar om
  de har ändrats.
- **Lokal kontroll.** Auth och Storage är samma fixturer som i projektets RLS-tester. En
  godkänd kontroll ersätter inte en återställning i ett separat Supabase-projekt före
  betald pilot.
- **Ingen schemaläggning.** Verktyget körs bara när du startar det.

## Beviset bakom verktygen

`tests/backup.test.cjs` provar sidindelning, skadade och saknade bilder, att färdiga
mappar inte skrivs över och att nyckeln aldrig skrivs ut eller sparas. Provet körs mot en
simulerad klient. Kontrollverktyget har också godkänt den riktiga backupen från
testmiljön 2026-10-06 (2 konton, 2 projekt, 2 bilder).
