# Egna domäner (T08) – plattformsdelen

Kunden kan koppla en domän som hen redan äger, till exempel `www.kafe-exempel.se`, till sin hemsida. Funktionen är
avstängd tills `CUSTOM_DOMAINS_ENABLED=1` sätts på båda Workers. Med flaggan avslagen syns ingen domänruta i appen,
`/api/domains` svarar 503, och sajt-Workern gör inga extra uppslag.

## Flödet

1. **Anspråk.** Kunden skriver domänen i publiceringsrutan under *Egen domän*. `POST /api/domains` normaliserar namnet
   till gemener och punycode. Servern skapar en slumpmässig utmaning (24 byte) som bara gäller det kontot och värdnamnet.
2. **Bevis.** Kunden lägger in en TXT-post hos sin domänleverantör: namnet `_templates-verifiering.<domän>` med
   värdet `templates=<utmaning>`. Inga andra DNS-poster ändras i det här steget, så kundens nuvarande sajt eller e-post
   påverkas inte.
3. **Kontroll.** `POST /api/domains/verify` frågar DNS via DNS-över-HTTPS (`cloudflare-dns.com`, JSON-format). Om
   kontots egen utmaning finns blir domänen `verified`.
4. **Aktivering (ägaren, manuellt under piloten).** Ägaren lägger upp värdnamnet i Cloudflare for SaaS (se nedan).
   När certifikatet är aktivt sätts raden till `active`. Först då visar sajt-Workern kundens sajt på domänen.
5. **Bortkoppling.** `POST /api/domains/remove` tar bort raden direkt, och domänen slutar visa sajten.

## Skydd

- **Övertagande.** Varje konto har en egen utmaning. En annan kunds värde, eller en kvarglömd TXT-post från en
  tidigare ägare, bevisar ingenting.
- **Samtidighet.** När någon verifierar tas övriga väntande anspråk bort. Det partiella unika indexet
  `custom_domains_confirmed` gör att bara ett konto kan ha domänen bekräftad, även om två verifierar samtidigt.
- **Utgång och gräns.** Väntande anspråk upphör efter 7 dagar. En sajt kan ha högst två domäner, till exempel med och
  utan `www`.
- **Reserverade namn.** Tjänstens egna värdnamn kan inte göras anspråk på: `*.workers.dev`, `*.pages.dev`,
  `PUBLISH_HOST`, `SITES_PATH_HOST`, `SITES_DOMAIN`, `CONTROL_HOST` och appens värd. Samma gäller IP-adresser,
  `localhost`, `.local`, `.test`, `.example` och `.invalid`.
- **Isolering.** API:t nås inte via en egen domän, och en egen domän tar bara emot `GET` och `HEAD`.
- **Spärrade konton.** Sajten hämtas via samma sajtlager som övriga besök, så en sajt som har spärrats av
  kontoavslutet visas inte heller på en egen domän.
- **Kontoavslut.** Kontoavslutet bör även ta bort kontots rader i `custom_domains`. Annars blir domänen spärrad för
  andra konton. Ingen främmande nyckel blockerar att sajten raderas.

## Driftsättning

### 1. Tabellen

Tabellen och indexen läggs till; inga befintliga tabeller ändras. Ta en säkerhetskopia först, med
`wrangler d1 export templates --remote`. Kör sedan följande med `wrangler d1 execute templates --remote --command "…"`:

```sql
create table if not exists custom_domains (hostname text not null, owner_id text not null, site_id text not null, token text not null, status text not null check (status in ('pending', 'verified', 'active')), created_at integer not null, verified_at integer, expires_at integer not null, primary key (hostname, owner_id));
create unique index if not exists custom_domains_confirmed on custom_domains (hostname) where status <> 'pending';
create index if not exists custom_domains_owner on custom_domains (owner_id);
create index if not exists custom_domains_site on custom_domains (site_id);
```

### 2. Koden och flaggan

Driftsätt API-Workern och sajt-Workern med den nya koden. Sätt sedan `CUSTOM_DOMAINS_ENABLED = "1"` under `[vars]`
på båda. Flaggan kan slås på innan aktiveringen är klar, eftersom kunder då kan bevisa ägarskap i förväg. Ingen domän
visar något förrän den är `active`.

### 3. Aktivering via Cloudflare for SaaS

Detta steg kräver ägarens egen domän som zon i Cloudflare.

1. Lägg till en egen domän, till exempel `templates-hemsidor.se`, som zon i Cloudflare med gratisplanen.
2. Slå på Cloudflare for SaaS (Custom Hostnames) i zonen.
   - Enligt Cloudflares dokumentation ingår 100 värdnamn i gratisplanen. Därefter kostar de 0,10 USD per månad och styck.
   - Kontrollera i panelen om aktiveringen kräver ett betalkort innan du fortsätter. Inget ska kosta pengar utan godkännande.
3. Skapa en reservadress (fallback origin), till exempel `kunder.templates-hemsidor.se`. Använd en proxad
   AAAA-post mot `100::`.
4. Ge sajt-Workern en route med mönstret `*/*` på SaaS-zonen.
5. Gör så här för varje bekräftad domän (`status = 'verified'`):
   1. Skapa värdnamnet under Custom Hostnames, med certifikatvalidering via HTTP.
   2. Be kunden lägga in en CNAME-post från `www.kundensdomän.se` till `kunder.templates-hemsidor.se`.
      - En domän utan `www` (apex) kräver att leverantören stöder CNAME-utplattning eller ALIAS.
      - Om leverantören inte stöder det kopplas bara `www`. Kunden sätter då en vidarebefordran från apex hos sin leverantör.
   3. När både värdnamnet och certifikatet är *Active* i Cloudflare, aktiverar du domänen:

   ```sql
   update custom_domains set status = 'active' where hostname = 'www.kundensdomän.se' and status = 'verified';
   ```

Bortkoppling i appen tar bort raden. Ta även bort värdnamnet under Custom Hostnames, så att certifikatet inte ligger kvar.

## Lokala prov

- `node --test tests/domains.test.cjs`: normalisering, övertagande, utgång, gräns, DoH-tolkning, API-rutterna och
  klienten. D1-lagringen provas mot `server/schema.sql` i SQLite.
- `testmiljo/domaner-20261006/run-domaner.mjs`: hela kedjan i workerd via Miniflare. DNS och Supabase är låtsade i den
  utgående trafiken, så inget lämnar datorn.
- `testmiljo/domaner-20261006/ui-domaner.cjs`: domänrutan i 390 och 1440 px, i ljust och mörkt läge, med axe-core.
