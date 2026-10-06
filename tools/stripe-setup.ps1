#requires -Version 7.0
<#
Owner-run setup for Templates only. Read-Host keeps input off the screen/history.
No secret file is created. Wrangler logging/telemetry are disabled for child processes.
Run in your own terminal, without transcription, debugging, or screen recording.
First run needs one restricted LIVE key. Recovery of an existing endpoint also asks
for its signing secret from Stripe Workbench; no endpoint is ever deleted.
Write permissions: Checkout Sessions, Customer portal, Customers, Webhook Endpoints.
Read permissions: Products, Prices. Real payments are always performed by the owner.
#>
param(
  [string]$Config = (Join-Path $PSScriptRoot 'wrangler-api.toml'),
  [string]$Wrangler = (Join-Path $env:TEMP 'tw-prov/node_modules/wrangler/bin/wrangler.js'),
  [switch]$CheckOnly
)

function Stop-TemplatesSetup([string]$Message) {
  $setupException = [InvalidOperationException]::new("Templates setup: $Message")
  $setupException.Data['TemplatesSetup'] = $true
  throw $setupException
}

function Read-TemplatesSecret([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  try { return [Net.NetworkCredential]::new('', $secure).Password.Trim() }
  finally { $secure.Dispose() }
}

function Invoke-SetupWrangler {
  param([string]$Cli, [string]$ConfigFile, [string[]]$Arguments, [AllowNull()][string]$InputText)
  $process = [Diagnostics.Process]::new()
  try {
    $info = [Diagnostics.ProcessStartInfo]::new('node')
    $configPath = (Resolve-Path -LiteralPath $ConfigFile -ErrorAction Stop).ProviderPath
    # Do not inherit the owner's home directory: Wrangler's project cache there
    # would become a legacy global config directory and hide the saved login.
    $info.WorkingDirectory = [IO.Path]::GetDirectoryName($configPath)
    $info.UseShellExecute = $false
    $info.CreateNoWindow = $true
    $info.RedirectStandardInput = $true
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.Environment['WRANGLER_WRITE_LOGS'] = 'false'
    $info.Environment['WRANGLER_LOG_SANITIZE'] = 'true'
    $info.Environment['WRANGLER_SEND_METRICS'] = 'false'
    $info.Environment['CI'] = 'true'
    $info.ArgumentList.Add((Resolve-Path -LiteralPath $Cli -ErrorAction Stop).ProviderPath)
    foreach ($arg in $Arguments) { $info.ArgumentList.Add($arg) }
    $info.ArgumentList.Add('--config'); $info.ArgumentList.Add($configPath)
    $process.StartInfo = $info
    try { $null = $process.Start() }
    catch { Stop-TemplatesSetup '[CF_START] Kunde inte starta Node.js för Cloudflare-kontrollen.' }
    $stdout = $process.StandardOutput.ReadToEndAsync()
    $stderr = $process.StandardError.ReadToEndAsync()
    if ($InputText) { $process.StandardInput.WriteLine($InputText) }
    $process.StandardInput.Close()
    if (-not $process.WaitForExit(90000)) {
      $process.Kill($true)
      Stop-TemplatesSetup 'Cloudflare svarade inte i tid. Ingen framgång är bekräftad.'
    }
    # Map known preflight errors to fixed messages; never return raw diagnostics.
    $diagnostic = $stderr.GetAwaiter().GetResult()
    $result = $stdout.GetAwaiter().GetResult()
    if ($process.ExitCode -ne 0) {
      if (($Arguments -join ' ') -eq 'secret list') {
        $diagnostic += $result
        if ($diagnostic -match 'requires at least Node.js') { Stop-TemplatesSetup '[CF_NODE] Terminalens Node.js-version är för gammal för Wrangler.' }
        if ($diagnostic -match 'keyring|keychain|Credential Manager') { Stop-TemplatesSetup '[CF_KEYRING] Wrangler kunde inte använda den sparade inloggningens nyckelhanterare.' }
        if ($diagnostic -match 'Not logged in|no credentials were found|necessary to set a CLOUDFLARE_API_TOKEN|token has expired') { Stop-TemplatesSetup '[CF_LOGIN] Wrangler hittar ingen användbar Cloudflare-inloggning i denna terminal.' }
        if ($diagnostic -match 'Authentication error|authorization|permission|\b10000\b') { Stop-TemplatesSetup '[CF_ACCESS] Cloudflare avvisade åtkomsten till Workern.' }
        if ($diagnostic -match 'fetch failed|ENOTFOUND|ECONNRESET|ETIMEDOUT|certificate') { Stop-TemplatesSetup '[CF_NETWORK] Anslutningen till Cloudflare misslyckades.' }
      }
      Stop-TemplatesSetup '[CF_COMMAND] Cloudflare-kommandot misslyckades; inget rått felsvar visas.'
    }
    # Only secret list has meaningful output; bulk output is discarded in memory.
    if (($Arguments -join ' ') -eq 'secret list') { return $result }
  } finally {
    $InputText = $null; $result = $null; $stdout = $null; $stderr = $null; $diagnostic = $null
    $process.Dispose()
  }
}

function Invoke-SetupStripe {
  param([string]$Method, [string]$Resource, [hashtable]$Headers, [hashtable]$Body)
  if ($Resource -notmatch '^/(prices/price_[A-Za-z0-9]+|products/prod_[A-Za-z0-9]+|webhook_endpoints(?:\?[^\s]*)?)$') {
    Stop-TemplatesSetup 'Otillåten Stripe-resurs.'
  }
  try {
    $params = @{ Method = $Method; Uri = "https://api.stripe.com/v1$Resource"; Headers = $Headers; TimeoutSec = 30; ErrorAction = 'Stop'; Verbose = $false; Debug = $false }
    if ($Body) { $params.Body = $Body; $params.ContentType = 'application/x-www-form-urlencoded' }
    return Invoke-RestMethod @params
  } catch { Stop-TemplatesSetup 'Stripe-anropet misslyckades. Kontrollera live-nyckelns behörigheter och anslutningen; inget rått felsvar visas.' }
}

function Get-SetupSecretNames([string]$Cli, [string]$ConfigFile) {
  try { $items = @(Invoke-SetupWrangler -Cli $Cli -ConfigFile $ConfigFile -Arguments @('secret', 'list') | ConvertFrom-Json -ErrorAction Stop) }
  catch {
    if ($_.Exception.Data['TemplatesSetup']) { throw }
    Stop-TemplatesSetup '[CF_JSON] Cloudflare-kontrollens svar kunde inte läsas. Ingen nyckel ska matas in.'
  }
  return @($items | ForEach-Object { if ($_.name -notmatch '^[A-Z][A-Z0-9_]*$') { Stop-TemplatesSetup 'Oväntat svar från Cloudflare.' }; $_.name })
}

function Test-SetupWebhook([string]$Url) {
  try {
    $response = Invoke-WebRequest -Uri $Url -Method Post -ContentType 'application/json' -Body '{}' -Headers @{ 'Stripe-Signature' = 't=0,v1=invalid' } -SkipHttpErrorCheck -TimeoutSec 30 -Verbose:$false -Debug:$false
    return $response.StatusCode -eq 400
  } catch { return $false }
}

function Invoke-TemplatesStripeSetup([string]$ConfigFile, [string]$Cli, [switch]$CheckOnly) {
  $ErrorActionPreference = 'Stop'
  $VerbosePreference = 'SilentlyContinue'; $DebugPreference = 'SilentlyContinue'; $ProgressPreference = 'SilentlyContinue'
  $key = $null; $signingSecret = $null; $headers = $null; $endpoint = $null; $payload = $null
  $url = 'https://templates-api.templates-hemsidor.workers.dev/api/stripe/webhook'
  $priceId = 'price_1UNQMQBf7Bcrv8UH0mvHYMAi'; $productId = 'prod_VOClaft57i4FpB'
  $apiVersion = '2026-09-30.endive'
  $events = @('checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted')
  try {
    if (-not (Test-Path -LiteralPath $Cli -PathType Leaf) -or -not (Test-Path -LiteralPath $ConfigFile -PathType Leaf)) { Stop-TemplatesSetup 'Wrangler eller konfiguration saknas.' }
    $configText = Get-Content -LiteralPath $ConfigFile -Raw
    foreach ($expected in @('name = "templates-api"', 'PUBLISH_HOST = "templates-api.templates-hemsidor.workers.dev"', "STRIPE_PRICE_ID = `"$priceId`"", "STRIPE_PRODUCT_ID = `"$productId`"", 'REQUIRE_PLAN = "1"', 'PLAN_PRICE_SEK = "499"')) {
      if (-not (($configText -split '\r?\n') -contains $expected)) { Stop-TemplatesSetup 'Konfigurationen pekar inte på förväntad Templates-Worker och produkt.' }
    }
    if ($configText -notmatch '(?m)^APP_ORIGIN = "https://[a-z0-9.-]+"\r?$') { Stop-TemplatesSetup 'Fas 1 måste först ge appen en riktig HTTPS-adress.' }
    if ($configText -match '(?m)^(STRIPE_TAX_RATE_ID|CONTROL_TOKEN|ALLOW_FAULTS)\s*=\s*"[^"]+"') { Stop-TemplatesSetup 'Oväntad skatt eller teststyrning i driftkonfigurationen.' }
    # Confirm an existing accessible worker before asking for the Stripe credential.
    $null = Get-SetupSecretNames $Cli $ConfigFile
    if ($CheckOnly) {
      Write-Host 'PASS [CF_PREFLIGHT]: Konfiguration och Cloudflare-åtkomst fungerar. Kontrolläge klart; ingen Stripe-nyckel efterfrågades och inga Stripe-anrop utfördes.'
      return
    }
    $key = Read-TemplatesSecret 'Klistra in begränsad Stripe LIVE-nyckel (visas inte)'
    if ($key -notmatch '^rk_live_[A-Za-z0-9]+$') { Stop-TemplatesSetup 'Endast en begränsad live-nyckel accepteras.' }
    $headers = @{ Authorization = "Bearer $key"; 'Stripe-Version' = $apiVersion }
    $price = Invoke-SetupStripe 'Get' "/prices/$priceId" $headers
    if ($price.id -ne $priceId -or $price.livemode -ne $true -or $price.active -ne $true -or $price.product -ne $productId -or $price.unit_amount -ne 49900 -or $price.currency -ne 'sek' -or $price.type -ne 'recurring' -or $price.recurring.interval -ne 'month' -or $price.recurring.interval_count -ne 1) {
      Stop-TemplatesSetup 'Priset är inte den aktiva Templates-produkten i live med 499 kr per månad i SEK.'
    }
    $product = Invoke-SetupStripe 'Get' "/products/$productId" $headers
    if ($product.id -ne $productId -or $product.livemode -ne $true -or $product.active -ne $true) { Stop-TemplatesSetup 'Templates-produkten är inte aktiv i live.' }
    $matching = @(); $cursor = ''; $pages = 0
    do {
      $resource = '/webhook_endpoints?limit=100'
      if ($cursor) { $resource += '&starting_after=' + [uri]::EscapeDataString($cursor) }
      $list = Invoke-SetupStripe 'Get' $resource $headers
      if ($null -eq $list.data -or $list.has_more -isnot [bool]) { Stop-TemplatesSetup 'Oväntat svar på webhook-listningen; ingen endpoint skapas.' }
      $matching += @($list.data | Where-Object { $_.url -eq $url })
      $pages++
      if ($list.has_more) {
        if (-not $list.data.Count -or $pages -ge 100) { Stop-TemplatesSetup 'Webhook-listan kunde inte läsas färdigt; ingen endpoint skapas.' }
        $next = $list.data[-1].id
        if ($next -notmatch '^we_[A-Za-z0-9]+$' -or $next -eq $cursor) { Stop-TemplatesSetup 'Ogiltig sidindelning i Stripe-svaret.' }
        $cursor = $next
      }
    } while ($list.has_more)
    if ($matching.Count -gt 1) { Stop-TemplatesSetup 'Flera endpoints har Templates-adressen. Granska dubbletterna manuellt; ingen ändras.' }
    if ($matching.Count -eq 1) {
      $endpoint = $matching[0]
      if ($endpoint.metadata.app -ne 'templates') { Stop-TemplatesSetup 'Befintlig endpoint är inte märkt som Templates. Ingen endpoint ändras.' }
    } else {
      $body = @{ url = $url; description = 'Templates abonnemang (Cloudflare Worker)'; 'metadata[app]' = 'templates'; api_version = $apiVersion }
      for ($i = 0; $i -lt $events.Count; $i++) { $body["enabled_events[$i]"] = $events[$i] }
      $headers['Idempotency-Key'] = 'templates-webhook-setup-v2-20261006'
      $endpoint = Invoke-SetupStripe 'Post' '/webhook_endpoints' $headers $body
      $headers.Remove('Idempotency-Key')
      $signingSecret = $endpoint.secret
    }
    if ($endpoint.url -ne $url -or $endpoint.livemode -ne $true -or $endpoint.status -ne 'enabled' -or $endpoint.metadata.app -ne 'templates' -or $endpoint.id -notmatch '^we_[A-Za-z0-9]+$' -or @((Compare-Object ($events | Sort-Object) (@($endpoint.enabled_events) | Sort-Object))).Count -ne 0) {
      Stop-TemplatesSetup 'Endpointens adress, live-status, markering eller händelser avviker. Ingen hemlighet överförs.'
    }
    if (-not $signingSecret) {
      Write-Host "Templates-endpoint finns redan: $($endpoint.id). Öppna just den i Stripe Workbench och visa dess signeringshemlighet."
      $signingSecret = Read-TemplatesSecret 'Klistra in endpointens signeringshemlighet (visas inte; skicka aldrig till chatten)'
    }
    if ($signingSecret -notmatch '^whsec_[A-Za-z0-9]+$') { Stop-TemplatesSetup 'Signeringshemligheten saknas eller har fel format.' }
    $payload = @{ STRIPE_SECRET_KEY = $key; STRIPE_WEBHOOK_SECRET = $signingSecret } | ConvertTo-Json -Compress
    $uploaded = $false
    for ($attempt = 1; $attempt -le 3; $attempt++) {
      try { Invoke-SetupWrangler -Cli $Cli -ConfigFile $ConfigFile -Arguments @('secret', 'bulk') -InputText $payload; $uploaded = $true; break }
      catch { if ($attempt -lt 3) { Write-Host 'Överföringen kunde inte bekräftas; försöker igen med samma värden i minnet.' } }
    }
    if (-not $uploaded) { Stop-TemplatesSetup 'Överföringen kunde inte bekräftas efter tre försök. Kör om och använd samma endpoints signeringshemlighet från Workbench. Radera inte webhooken.' }
    $names = @(Get-SetupSecretNames $Cli $ConfigFile)
    if ($names -notcontains 'STRIPE_SECRET_KEY' -or $names -notcontains 'STRIPE_WEBHOOK_SECRET') { Stop-TemplatesSetup 'Båda hemligheternas namn måste finnas; installationen är inte verifierad.' }
    if (-not (Test-SetupWebhook $url)) { Stop-TemplatesSetup 'Webhooken gav inte förväntad 400 på fel signatur. Installationens funktion är inte verifierad.' }
    Write-Host 'PASS: båda hemligheterna överförda och fel signatur nekas. Riktigt Stripe-event och köp återstår.'
    'STRIPE_SECRET_KEY'; 'STRIPE_WEBHOOK_SECRET'
  } finally {
    if ($endpoint -and $endpoint.PSObject.Properties['secret']) { $endpoint.secret = $null }
    $key = $null; $signingSecret = $null; $headers = $null; $payload = $null; $endpoint = $null
  }
}

if ($MyInvocation.InvocationName -ne '.') {
  try { Invoke-TemplatesStripeSetup -ConfigFile $Config -Cli $Wrangler -CheckOnly:$CheckOnly }
  catch {
    # Report only our fixed diagnostics, never provider errors or source-line dumps.
    $message = 'Templates setup: installationen avbröts; inget komplett resultat är bekräftat.'
    if ($_.Exception.Message.StartsWith('Templates setup: ')) { $message = $_.Exception.Message }
    [Console]::Error.WriteLine($message)
    [Console]::Error.WriteLine('Skriptet är avslutat. Klistra INTE in någon nyckel vid PowerShells vanliga PS-prompt.')
    exit 1
  }
}
